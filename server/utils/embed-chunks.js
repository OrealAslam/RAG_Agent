// utils/embed-chunks.js
import { embeddings } from "./embeddings.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function l2Normalize(vec) {
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return norm === 0 ? vec : vec.map((v) => v / norm);
}

/**
 * Validates that `batchVecs` is a proper number[][], with each inner
 * array having exactly `expectedDim` finite numbers.
 * Returns the first invalid index, or -1 if all valid.
 */
function findInvalidIndex(batchVecs, expectedDim) {
    if (!Array.isArray(batchVecs)) return 0;
    for (let i = 0; i < batchVecs.length; i++) {
        const v = batchVecs[i];
        if (!Array.isArray(v)) return i;
        if (v.length !== expectedDim) return i;
        if (!v.every((n) => typeof n === "number" && Number.isFinite(n))) return i;
    }
    return -1;
}

/**
 * Embed one slice. Retries on:
 *   - 429 / RESOURCE_EXHAUSTED
 *   - empty or malformed vector arrays
 * Each retry waits progressively longer — the "empty response" mode
 * from Google is usually transient (quota window refreshes).
 */
async function embedBatchWithRetry(slice, expectedDim, attempt = 1) {
    const MAX_ATTEMPTS = 6;

    let batchVecs;
    try {
        batchVecs = await embeddings.embedDocuments(slice);
    } catch (e) {
        const status = e.status ?? e.code;
        const is429 =
            status === 429 || /RESOURCE_EXHAUSTED|429/.test(String(e.message));
        if (is429 && attempt <= MAX_ATTEMPTS) {
            const wait = Math.min(2000 * attempt, 15000);
            console.warn(
                `⏳ 429 on batch of ${slice.length} — retry ${attempt}/${MAX_ATTEMPTS} in ${wait}ms`
            );
            await sleep(wait);
            return embedBatchWithRetry(slice, expectedDim, attempt + 1);
        }
        throw e;
    }

    // Response arrived without throwing — but is it structurally valid?
    const badIdx = findInvalidIndex(batchVecs, expectedDim);
    if (badIdx === -1 && batchVecs.length === slice.length) {
        return batchVecs; // ✓ all good
    }

    // Structural failure — this is the case that was silently poisoning
    // your Qdrant upsert.
    const gotCount = Array.isArray(batchVecs) ? batchVecs.length : "non-array";
    const firstLen = batchVecs?.[0]?.length ?? "n/a";
    console.warn(
        `⚠️  Malformed embedding response — ` +
        `expected ${slice.length} vectors @ ${expectedDim} dims, ` +
        `got ${gotCount} with first item length ${firstLen}. ` +
        `Bad index: ${badIdx}`
    );

    if (attempt > MAX_ATTEMPTS) {
        throw new Error(
            `Embedding API returned malformed vectors after ${MAX_ATTEMPTS} attempts ` +
            `(batch of ${slice.length}, expected ${expectedDim} dims). ` +
            `This usually means quota exhaustion or a transient API fault. ` +
            `Wait a minute and retry the upload.`
        );
    }

    const wait = Math.min(3000 * attempt, 20000);
    console.warn(`⏳ retry ${attempt}/${MAX_ATTEMPTS} in ${wait}ms`);
    await sleep(wait);
    return embedBatchWithRetry(slice, expectedDim, attempt + 1);
}

export async function embedChunks(chunks) {
    if (!chunks.length) return [];

    const filtered = chunks.filter((c) => c.pageContent?.trim().length > 0);
    if (filtered.length !== chunks.length) {
        console.warn(
            `Filtered ${chunks.length - filtered.length} empty chunk(s). ` +
            `If this is all of them, the PDF likely has no text layer (scanned).`
        );
    }
    if (filtered.length === 0) {
        throw new Error(
            "No extractable text found in the document. " +
            "If this is a scanned PDF, you need OCR (e.g. tesseract.js) before chunking."
        );
    }

    const texts = filtered.map((c) => c.pageContent);
    const BATCH = 50;          // smaller batch → fewer transient failures
    const vectors = [];

    // Determine expected dim from a canary embed — catches model/param drift
    // before you waste time on all batches.
    const canary = await embedBatchWithRetry([texts[0]], 768, 1);
    const EXPECTED_DIM = canary[0].length;
    console.log(`Expected vector dim: ${EXPECTED_DIM}`);
    vectors.push(canary[0]);

    for (let i = 1; i < texts.length; i += BATCH) {
        const slice = texts.slice(i, i + BATCH);
        const batchVecs = await embedBatchWithRetry(slice, EXPECTED_DIM);
        vectors.push(...batchVecs);
        console.log(`Embedded ${vectors.length}/${texts.length} chunks`);
        if (i + BATCH < texts.length) await sleep(3000);
    }

    return filtered.map((chunk, i) => ({
        text: chunk.pageContent,
        metadata: chunk.metadata,
        vector: l2Normalize(vectors[i]),
    }));
}