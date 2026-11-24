// utils/qdrant.js

import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config"


export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY, // omit for local Docker
  // checkCompatibility: false, // ← ADD: skip the background version probe
});

export const COLLECTION_NAME = "rag_documents";
export const VECTOR_SIZE = 768; // matches text-embedding-3-small