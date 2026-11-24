// utils/embeddings.js
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768; // must match VECTOR_SIZE in qdrant.js

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBEDDING_MODEL,
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  outputDimensionality: EMBEDDING_DIMENSIONS,
});