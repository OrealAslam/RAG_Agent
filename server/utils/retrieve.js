// here we will embedd the query and retrieve the most relevant chunks from Qdrant
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { qdrant, COLLECTION_NAME } from "./qdrant.js";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./embeddings.js";

// Query-side embedder — different taskType from ingestion
const queryEmbeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBEDDING_MODEL,
  taskType: TaskType.RETRIEVAL_QUERY,
  outputDimensionality: EMBEDDING_DIMENSIONS,
});

/**
 * @param {string} query
 * @param {{ k?: number, docId?: string, minScore?: number }} opts
 */
export async function retrieveChunks(query, { k = 6, docId, minScore = 0.2 } = {}) {
  const vectorStore = new QdrantVectorStore(queryEmbeddings, {
    client: qdrant,
    collectionName: COLLECTION_NAME,
  });

  // Scope search to a single document when docId is provided
  const filter = docId
    ? { must: [{ key: "metadata.docId", match: { value: docId } }] }
    : undefined;

  // LangChain embeds `query` internally with queryEmbeddings (RETRIEVAL_QUERY)
  const results = await vectorStore.similaritySearchWithScore(query, k, filter);

  return results
    .filter(([, score]) => score >= minScore)
    .map(([doc, score]) => ({
      text: doc.pageContent,
      score,
      chunkIndex: doc.metadata.chunkIndex,
      fileName: doc.metadata.fileName,
    }));
}