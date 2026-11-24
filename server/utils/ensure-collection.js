// utils/ensure-collection.js
import { qdrant, COLLECTION_NAME, VECTOR_SIZE } from "./qdrant.js";

export async function ensureCollection() {
  // ── 1. Ensure the collection exists ──
  const { collections } = await qdrant.getCollections();
  const exists = collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    console.log(`✅ Created collection "${COLLECTION_NAME}"`);
  } else {
    console.log(`ℹ️  Collection "${COLLECTION_NAME}" exists`);
  }

  // ── 2. Verify the payload index on metadata.docId ──
  const INDEX_FIELD = "metadata.docId";

  const { payload_schema } = await qdrant.getCollection(COLLECTION_NAME);
  const hasIndex = Object.keys(payload_schema ?? {}).includes(INDEX_FIELD);

  if (hasIndex) {
    console.log(`ℹ️  Payload index "${INDEX_FIELD}" already exists`);
    return;
  }

  // ── 3. Create it synchronously ──
  try {
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: INDEX_FIELD,
      field_schema: "keyword",
      wait: true, // ← block until the index is actually built
    });
    console.log(`✅ Payload index created on "${INDEX_FIELD}"`);
  } catch (e) {
    // Re-check: if the index now exists, it was a benign "already exists" race
    const { payload_schema: after } = await qdrant.getCollection(COLLECTION_NAME);
    if (Object.keys(after ?? {}).includes(INDEX_FIELD)) {
      console.log(`ℹ️  Payload index "${INDEX_FIELD}" already exists (race resolved)`);
      return;
    }
    // Genuinely failed — surface the actual error
    console.error(`❌ Failed to create payload index on "${INDEX_FIELD}":`);
    console.error('   ', e.data?.status?.error || e.message);
    throw e;
  }
}