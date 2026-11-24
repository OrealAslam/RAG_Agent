import { QdrantVectorStore } from "@langchain/qdrant";
import crypto from "crypto";
import { qdrant, COLLECTION_NAME } from "./qdrant.js";
import { embeddings } from "./embeddings.js";

function deterministicUUID(str) {
  const hash = crypto.createHash("sha256").update(str).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

/**
 * @param {Array<{ text, metadata, vector }>} embedded  from embedChunks()
 * @param {{ docId: string, fileName: string }} meta
 */
export async function ingestChunks(embedded, meta) {
  if (!embedded.length) return 0;

  const docs = embedded.map((e, i) => ({
    pageContent: e.text,
    metadata: {
      ...e.metadata,
      docId: meta.docId,
      fileName: meta.fileName,
      chunkIndex: i,
    },
  }));

  // Deterministic IDs → re-upload of same doc REPLACES points, no duplicates
  const ids = docs.map((d) =>
    deterministicUUID(`${meta.docId}:${d.metadata.chunkIndex}`)
  );

  const vectorStore = new QdrantVectorStore(embeddings, {
    client: qdrant,
    collectionName: COLLECTION_NAME,
  });

  // Use pre-computed vectors — skip re-embedding
  await vectorStore.addVectors(
    embedded.map((e) => e.vector),
    docs,
    { ids }
  );

  console.log(`✅ Upserted ${docs.length} points for doc ${meta.docId}`);
  return docs.length;
}