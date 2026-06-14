import { NextRequest, NextResponse } from "next/server";
import { ChromaClient } from "chromadb";

export async function GET(req: NextRequest) {
  try {
    const chromaUrl = req.headers.get("x-chroma-url") || "http://localhost:8000";
    const collectionName = req.headers.get("x-chroma-collection") || "rag_knowledge_base";

    const chromaClient = new ChromaClient({ path: chromaUrl });
    
    // Check if collection exists
    const collections = await chromaClient.listCollections();
    const exists = collections.some((c) => c.name === collectionName);
    
    if (!exists) {
      return NextResponse.json({ documents: [] });
    }

    const collection = await chromaClient.getCollection({ name: collectionName });
    
    // Fetch all metadata to identify stored documents
    const data = await collection.get({
      include: ["metadatas"] as any
    });

    const docMap: Record<string, {
      name: string;
      pages: number;
      chunks: number;
      size: number;
      uploadedAt: string;
    }> = {};

    if (data.metadatas) {
      data.metadatas.forEach((meta: any) => {
        if (meta && meta.source) {
          const sourceName = meta.source;
          if (!docMap[sourceName]) {
            docMap[sourceName] = {
              name: sourceName,
              pages: meta.totalPages || 1,
              chunks: 0,
              size: meta.fileSize || 0,
              uploadedAt: meta.uploadedAt || new Date().toISOString()
            };
          }
          docMap[sourceName].chunks += 1;
          if (meta.page && meta.page > docMap[sourceName].pages) {
            docMap[sourceName].pages = meta.page;
          }
        }
      });
    }

    const documents = Object.values(docMap);
    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error("Failed to list documents:", error);
    return NextResponse.json({ error: error.message || "Failed to list documents" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("name");

    if (!fileName) {
      return NextResponse.json({ error: "Document name is required" }, { status: 400 });
    }

    const chromaUrl = req.headers.get("x-chroma-url") || "http://localhost:8000";
    const collectionName = req.headers.get("x-chroma-collection") || "rag_knowledge_base";

    const chromaClient = new ChromaClient({ path: chromaUrl });
    const collection = await chromaClient.getCollection({ name: collectionName });

    // Delete chunks matching the filename
    await collection.delete({
      where: { source: fileName }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted document ${fileName} from knowledge base`
    });
  } catch (error: any) {
    console.error("Failed to delete document:", error);
    return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 });
  }
}
