// utils/chunker.js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "path";

/**
 * Loads a PDF or DOCX file and splits it into overlapping chunks.
 * @param {string} filePath - Absolute path to the file on disk.
 * @returns {Promise<import("@langchain/core/documents").Document[]>}
 */
export async function loadAndChunkFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  let loader;
  if (ext === ".pdf") {
    // splitPages: false merges all pages into one continuous text stream.
    // For RAG, this is often better because a single answer may span two pages.
    loader = new PDFLoader(filePath, { splitPages: false });
  } else if (ext === ".docx" || ext === ".doc") {
    loader = new DocxLoader(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  // 1. Extract raw text as LangChain Document objects
  const docs = await loader.load();
  console.log(`Loaded ${docs.length} page(s) from ${path.basename(filePath)}`);

  // 2. Split into overlapping chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,      // target chunk size in characters
    chunkOverlap: 200,    // 20% overlap to preserve context across boundaries
    separators: ["\n\n", "\n", ". ", " ", ""], // default order
  });

  const chunks = await splitter.splitDocuments(docs);
  console.log(`Split into ${chunks.length} chunks.`);

  return chunks;
}