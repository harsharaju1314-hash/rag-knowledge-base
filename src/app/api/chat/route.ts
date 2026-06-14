import { NextRequest, NextResponse } from "next/server";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { ChromaClient } from "chromadb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages: chatHistory = [], selectedDocs = [], modelName = "gpt-4o" } = body;

    // Retrieve last message
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }
    const query = lastMessage.content;

    const cleanHeader = (val: string | null | undefined) => {
      if (!val || val === "undefined" || val === "null" || val === "API Key Needed" || val.trim() === "") {
        return undefined;
      }
      return val;
    };

    // Configs from headers
    const rawOpenAIKey = cleanHeader(req.headers.get("x-openai-key"));
    const openAIApiKey = rawOpenAIKey || cleanHeader(process.env.OPENAI_API_KEY);
    const chromaUrl = req.headers.get("x-chroma-url") || "http://localhost:8000";
    const collectionName = req.headers.get("x-chroma-collection") || "rag_knowledge_base";
    const customSystemPrompt = req.headers.get("x-system-prompt");
    const topK = parseInt(req.headers.get("x-top-k") || "4", 10);

    const embeddingsProvider = req.headers.get("x-embeddings-provider") || "openai";
    const embeddingsModel = req.headers.get("x-embeddings-model") || "text-embedding-3-small";
    const ollamaUrl = req.headers.get("x-ollama-url") || "http://localhost:11434";

    const llmProvider = req.headers.get("x-llm-provider") || "openai";
    const groqApiKey = cleanHeader(req.headers.get("x-groq-key"));

    // Validations
    if (llmProvider === "openai" && !openAIApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key is required for OpenAI models." },
        { status: 400 }
      );
    }
    if (llmProvider === "groq" && !groqApiKey) {
      return NextResponse.json(
        { error: "Groq API Key is required for Groq models." },
        { status: 400 }
      );
    }
    if (embeddingsProvider === "openai" && !openAIApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key is required for similarity search embeddings." },
        { status: 400 }
      );
    }

    // Verify Chroma collection exists and has elements
    const chromaClient = new ChromaClient({ path: chromaUrl });
    const collections = await chromaClient.listCollections();
    const exists = collections.some((c) => c.name === collectionName);
    
    let results: any[] = [];
    
    if (exists) {
      const collection = await chromaClient.getCollection({ name: collectionName });
      const count = await collection.count();

      if (count > 0) {
        // Initialize embeddings
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

        const vectorStore = await Chroma.fromExistingCollection(embeddings, {
          collectionName: collectionName,
          url: chromaUrl,
        });

        // Construct metadata filter if specific documents are selected
        let filter: any = undefined;
        if (selectedDocs && selectedDocs.length > 0) {
          if (selectedDocs.length === 1) {
            filter = { source: selectedDocs[0] };
          } else {
            filter = { source: { $in: selectedDocs } };
          }
        }

        // Similarity search
        results = await vectorStore.similaritySearch(query, topK, filter);
      }
    }

    // Format context from retrieved chunks
    const context = results.length > 0
      ? results.map((doc, idx) => `[Source ${idx + 1} - ${doc.metadata.source} (Page ${doc.metadata.page}/${doc.metadata.totalPages})]:\n${doc.pageContent}`).join("\n\n")
      : "No document fragments found. Respond based on your general knowledge but mention that no matching documents were found in the knowledge base.";

    // Assemble messages for LLM
    const promptInstructions = customSystemPrompt || 
      "You are Aetheria, an advanced AI Knowledge Assistant. Answer the user's question using the provided document context. " +
      "If the context does not contain the answer, state that you cannot find the answer in the uploaded documents, " +
      "and do not try to make up a response. " +
      "Always quote and reference specific sources when answering.";

    const systemPrompt = `${promptInstructions}\n\n[DOCUMENT CONTEXT]\n${context}`;

    const formattedMessages: BaseMessage[] = [new SystemMessage(systemPrompt)];

    // Add previous chat history (excluding current user query)
    const historyToProcess = chatHistory.slice(0, -1);
    historyToProcess.forEach((msg: any) => {
      if (msg.role === "user") {
        formattedMessages.push(new HumanMessage(msg.content));
      } else if (msg.role === "assistant") {
        formattedMessages.push(new AIMessage(msg.content));
      }
    });

    // Add current user query
    formattedMessages.push(new HumanMessage(query));

    // Initialize LLM Chat model based on provider
    let chat;
    if (llmProvider === "groq") {
      chat = new ChatOpenAI({
        apiKey: groqApiKey!,
        configuration: {
          baseURL: "https://api.groq.com/openai/v1",
        },
        modelName: modelName,
        temperature: 0.1,
      });
    } else if (llmProvider === "ollama") {
      const activeModel = (modelName.startsWith("gpt-") || modelName.startsWith("llama-3.1-70b")) ? "gemma2:2b" : modelName;
      chat = new ChatOpenAI({
        apiKey: "ollama",
        configuration: {
          baseURL: `${ollamaUrl}/v1`,
        },
        modelName: activeModel,
        temperature: 0.1,
      });
    } else {
      chat = new ChatOpenAI({
        apiKey: openAIApiKey!,
        modelName: modelName,
        temperature: 0.1,
      });
    }

    const response = await chat.invoke(formattedMessages);
    const answer = response.content;

    // Return answer and citations
    return NextResponse.json({
      answer: answer,
      sources: results.map((r, idx) => ({
        id: `source-${idx}`,
        content: r.pageContent,
        metadata: r.metadata
      }))
    });
  } catch (error: any) {
    console.error("Chat/RAG execution failed:", error);
    console.log("Debug Context:", {
      llmProvider: req.headers.get("x-llm-provider"),
      embeddingsProvider: req.headers.get("x-embeddings-provider"),
      hasOpenAIKey: !!(req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY),
      openAIKeyHeaderVal: req.headers.get("x-openai-key"),
      hasGroqKey: !!req.headers.get("x-groq-key"),
      groqKeyHeaderVal: req.headers.get("x-groq-key"),
      ollamaUrl: req.headers.get("x-ollama-url")
    });
    return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
  }
}
