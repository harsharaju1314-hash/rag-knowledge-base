import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChromaClient } from "chromadb";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const cleanHeader = (val: string | null | undefined) => {
      if (!val || val === "undefined" || val === "null" || val === "API Key Needed" || val.trim() === "") {
        return undefined;
      }
      return val;
    };

    // Get configs from headers
    const rawOpenAIKey = cleanHeader(req.headers.get("x-openai-key"));
    const openAIApiKey = rawOpenAIKey || cleanHeader(process.env.OPENAI_API_KEY);
    const chromaUrl = req.headers.get("x-chroma-url") || "http://localhost:8000";
    const collectionName = req.headers.get("x-chroma-collection") || "rag_knowledge_base";
    
    const chunkSize = parseInt(req.headers.get("x-chunk-size") || "1000", 10);
    const chunkOverlap = parseInt(req.headers.get("x-chunk-overlap") || "200", 10);

    const embeddingsProvider = req.headers.get("x-embeddings-provider") || "openai";
    const embeddingsModel = req.headers.get("x-embeddings-model") || "text-embedding-3-small";
    const ollamaUrl = req.headers.get("x-ollama-url") || "http://localhost:11434";

    if (embeddingsProvider === "openai" && !openAIApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key is required for OpenAI embeddings. Configure it in Settings or switch to Ollama." },
        { status: 400 }
      );
    }

    // Convert file to Blob for PDFLoader
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    // Load PDF
    const loader = new PDFLoader(blob);
    const docs = await loader.load();

    if (docs.length === 0) {
      return NextResponse.json({ error: "Could not extract text from PDF file" }, { status: 400 });
    }

    // Add metadata for each page
    const totalPages = docs.length;
    docs.forEach((doc, idx) => {
      const pageNumber = doc.metadata.page || doc.metadata.loc?.pageNumber || (idx + 1);
      doc.metadata = {
        source: file.name,
        page: pageNumber,
        totalPages: totalPages,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };
    });

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkSize,
      chunkOverlap: chunkOverlap,
    });
    
    const splitDocs = await splitter.splitDocuments(docs);

    // Initialize embeddings based on provider
    let embeddings;
    if (embeddingsProvider === "ollama") {
      const activeEmbedModel = (embeddingsModel.startsWith("text-embedding-")) ? "nomic-embed-text" : embeddingsModel;
      const { OllamaEmbeddings } = await import("@langchain/ollama");
      embeddings = new OllamaEmbeddings({
        model: activeEmbedModel,
        baseUrl: ollamaUrl,
      });
    } else {
      embeddings = new OpenAIEmbeddings({
        apiKey: openAIApiKey!,
        modelName: embeddingsModel,
      });
    }

    // Delete existing chunks with same source first to avoid duplicates
    try {
      const chromaClient = new ChromaClient({ path: chromaUrl });
      const collection = await chromaClient.getOrCreateCollection({
        name: collectionName,
      });
      
      // Delete documents where metadata key 'source' equals file name
      await collection.delete({
        where: { source: file.name }
      });
    } catch (err) {
      console.warn("Failed to delete existing document chunks from Chroma. This is normal if the collection is new.", err);
    }

    // Store split documents in ChromaDB
    await Chroma.fromDocuments(splitDocs, embeddings, {
      collectionName: collectionName,
      url: chromaUrl,
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      pageCount: totalPages,
      chunkCount: splitDocs.length,
      message: `Successfully indexed ${file.name} (${splitDocs.length} chunks across ${totalPages} pages)`
    });
  } catch (error: any) {
    console.error("PDF upload/indexing failed:", error);
    return NextResponse.json({ error: error.message || "Failed to process PDF" }, { status: 500 });
  }
}
