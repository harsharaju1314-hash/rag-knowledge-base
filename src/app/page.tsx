"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Settings, 
  Trash2, 
  MessageSquare, 
  Send, 
  Database, 
  FileText, 
  X, 
  ChevronRight,
  BookOpen,
  Key,
  Sliders,
  RefreshCw,
  Sparkles,
  Layers,
  Search,
  FileCode,
  CornerDownRight,
  Play,
  AlertCircle
} from "lucide-react";

interface DocumentMeta {
  name: string;
  pages: number;
  chunks: number;
  size: number;
  uploadedAt: string;
}

interface Citation {
  id: string;
  content: string;
  metadata: {
    source: string;
    page: number;
    totalPages: number;
    fileSize?: number;
    uploadedAt?: string;
    [key: string]: any;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Citation[];
  error?: boolean;
}

export default function Home() {
  // App configurations
  const [apiKey, setApiKey] = useState("");
  const [chromaUrl, setChromaUrl] = useState("http://localhost:8000");
  const [collectionName, setCollectionName] = useState("rag_knowledge_base");
  const [modelName, setModelName] = useState("gemma2:2b");
  const [topK, setTopK] = useState(4);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Free/Local Providers
  const [embeddingsProvider, setEmbeddingsProvider] = useState("ollama");
  const [embeddingsModel, setEmbeddingsModel] = useState("nomic-embed-text");
  const [llmProvider, setLlmProvider] = useState("ollama");
  const [groqKey, setGroqKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");

  // Sandbox Workspace States
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const isSandboxModeRef = useRef(isSandboxMode);

  useEffect(() => {
    isSandboxModeRef.current = isSandboxMode;
  }, [isSandboxMode]);

  // States
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to Aetheria. I am your RAG search partner. Load policy handbook PDFs in the sidebar, enter your OpenAI API key in settings, and start exploring."
    }
  ]);
  const [input, setInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  
  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection & Chat States
  const [dbStatus, setDbStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [isChatting, setIsChatting] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Ref
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check Chroma DB connection and load documents
  const checkConnectionAndLoadDocs = async (url = chromaUrl, collection = collectionName) => {
    if (isSandboxModeRef.current) return;
    setDbStatus("checking");
    try {
      const res = await fetch("/api/documents", {
        headers: {
          "x-chroma-url": url,
          "x-chroma-collection": collection
        }
      });
      
      if (isSandboxModeRef.current) return;

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setDbStatus("connected");
      } else {
        setDbStatus("disconnected");
      }
    } catch (err) {
      console.error(err);
      if (isSandboxModeRef.current) return;
      setDbStatus("disconnected");
    }
  };

  // Enable standalone sandbox fallback workspace
  const setSandboxMode = (active: boolean) => {
    setIsSandboxMode(active);
    try {
      localStorage.setItem("aetheria_sandbox_mode", String(active));
    } catch (e) {
      console.warn("localStorage write blocked", e);
    }
    
    if (active) {
      setDbStatus("connected");
      setDocuments([
        {
          name: "Aetheria_Employee_Handbook.pdf",
          pages: 24,
          chunks: 56,
          size: 2450000,
          uploadedAt: new Date().toISOString()
        },
        {
          name: "Security_Protocols_2026.pdf",
          pages: 10,
          chunks: 32,
          size: 1220000,
          uploadedAt: new Date().toISOString()
        }
      ]);
      setMessages([
        {
          role: "assistant",
          content: "✨ **Offline Sandbox Mode is active.**\n\nI have preloaded two policy document templates: `Aetheria_Employee_Handbook.pdf` and `Security_Protocols_2026.pdf`. Feel free to query about **vacation policy**, **hybrid/remote work**, or **password security** to explore vector semantic retrieval and citation mapping offline."
        }
      ]);
    } else {
      setDocuments([]);
      setMessages([
        {
          role: "assistant",
          content: "Offline Sandbox mode deactivated. Please configure your workspace settings and ensure local ChromaDB server is running to execute live queries."
        }
      ]);
      setTimeout(() => checkConnectionAndLoadDocs(), 500);
    }
  };

  // Load configs from LocalStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const getCleanItem = (key: string, fallback: string) => {
          const val = localStorage.getItem(key);
          if (val === null || val === "undefined" || val === "null" || val.trim() === "") {
            localStorage.setItem(key, fallback);
            return fallback;
          }
          return val;
        };

        const storedKey = getCleanItem("aetheria_openai_key", "");
        const storedUrl = getCleanItem("aetheria_chroma_url", "http://localhost:8000");
        const storedColl = getCleanItem("aetheria_collection", "rag_knowledge_base");
        const storedModel = getCleanItem("aetheria_model", "gemma2:2b");
        const storedTopK = parseInt(getCleanItem("aetheria_top_k", "4"), 10);
        const storedChunk = parseInt(getCleanItem("aetheria_chunk_size", "1000"), 10);
        const storedOverlap = parseInt(getCleanItem("aetheria_chunk_overlap", "200"), 10);
        const storedPrompt = getCleanItem("aetheria_system_prompt", "");
        const storedSandbox = localStorage.getItem("aetheria_sandbox_mode") === "true";

        const storedEmbedProvider = getCleanItem("aetheria_embeddings_provider", "ollama");
        const storedEmbedModel = getCleanItem("aetheria_embeddings_model", "nomic-embed-text");
        const storedLlmProvider = getCleanItem("aetheria_llm_provider", "ollama");
        const storedGroqKey = getCleanItem("aetheria_groq_key", "");
        const storedOllamaUrl = getCleanItem("aetheria_ollama_url", "http://localhost:11434");

        setApiKey(storedKey);
        setChromaUrl(storedUrl);
        setCollectionName(storedColl);
        setTopK(storedTopK);
        setChunkSize(storedChunk);
        setChunkOverlap(storedOverlap);
        setSystemPrompt(storedPrompt);
        setGroqKey(storedGroqKey);
        setOllamaUrl(storedOllamaUrl);

        // Smart credentials fallback: if OpenAI is selected but no key is provided, default to Ollama
        const activeLlmProvider = (!storedKey && storedLlmProvider === "openai") ? "ollama" : storedLlmProvider;
        const activeModelName = (!storedKey && storedLlmProvider === "openai") ? "gemma2:2b" : storedModel;
        const activeEmbedProvider = (!storedKey && storedEmbedProvider === "openai") ? "ollama" : storedEmbedProvider;
        const activeEmbedModel = (!storedKey && storedEmbedProvider === "openai") ? "nomic-embed-text" : storedEmbedModel;

        setLlmProvider(activeLlmProvider);
        setModelName(activeModelName);
        setEmbeddingsProvider(activeEmbedProvider);
        setEmbeddingsModel(activeEmbedModel);
        
        if (storedSandbox) {
          setSandboxMode(true);
        }
      }
    } catch (e) {
      console.warn("localStorage read blocked", e);
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (chromaUrl && !isSandboxMode) {
      checkConnectionAndLoadDocs();
    }
  }, [chromaUrl, collectionName, isSandboxMode]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isChatting]);

  // Save configurations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("aetheria_openai_key", apiKey);
      localStorage.setItem("aetheria_chroma_url", chromaUrl);
      localStorage.setItem("aetheria_collection", collectionName);
      localStorage.setItem("aetheria_model", modelName);
      localStorage.setItem("aetheria_top_k", String(topK));
      localStorage.setItem("aetheria_chunk_size", String(chunkSize));
      localStorage.setItem("aetheria_chunk_overlap", String(chunkOverlap));
      localStorage.setItem("aetheria_system_prompt", systemPrompt);

      localStorage.setItem("aetheria_embeddings_provider", embeddingsProvider);
      localStorage.setItem("aetheria_embeddings_model", embeddingsModel);
      localStorage.setItem("aetheria_llm_provider", llmProvider);
      localStorage.setItem("aetheria_groq_key", groqKey);
      localStorage.setItem("aetheria_ollama_url", ollamaUrl);
    } catch (err) {
      console.warn("localStorage save blocked", err);
    }

    setShowSettings(false);
    if (!isSandboxMode) {
      checkConnectionAndLoadDocs(chromaUrl, collectionName);
    }
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // File Ingestion (Live + Sandbox fallback)
  const handleFileUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Only PDF documents are supported for semantic indexing.");
      return;
    }
    
    setIsUploading(true);
    setUploadStatus("Uploading PDF file stream...");
    
    // Sandbox Mode upload flow
    if (isSandboxMode) {
      setTimeout(() => setUploadStatus("Reading document buffers..."), 800);
      setTimeout(() => setUploadStatus("Splitting blocks & mapping overlaps..."), 1600);
      setTimeout(() => setUploadStatus("Saving embeddings to vector collection..."), 2600);
      setTimeout(() => {
        const newDoc: DocumentMeta = {
          name: file.name,
          pages: Math.floor(Math.random() * 15) + 3,
          chunks: Math.floor(Math.random() * 40) + 12,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        setDocuments(prev => [...prev, newDoc]);
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `✨ **Sandbox Ingestion Complete!**\n\nSuccessfully processed \`${file.name}\`. Segmented into \`${newDoc.chunks}\` chunks across \`${newDoc.pages}\` pages. Added to local sandbox collection.`
          }
        ]);
        setIsUploading(false);
        setUploadStatus("");
      }, 3500);
      return;
    }

    // Live backend upload flow
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadStatus("Reading document buffers...");
      setTimeout(() => setUploadStatus("Parsing paragraphs..."), 1000);
      setTimeout(() => setUploadStatus("Splitting blocks & mapping overlaps..."), 2000);
      setTimeout(() => setUploadStatus("Saving embeddings to vector collection..."), 3500);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-openai-key": apiKey,
          "x-chroma-url": chromaUrl,
          "x-chroma-collection": collectionName,
          "x-chunk-size": String(chunkSize),
          "x-chunk-overlap": String(chunkOverlap),
          "x-embeddings-provider": embeddingsProvider,
          "x-embeddings-model": embeddingsModel,
          "x-ollama-url": ollamaUrl
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload document");
      }

      const data = await res.json();
      setUploadStatus("Indexed!");
      
      await checkConnectionAndLoadDocs();
      
      setMessages(prev => [
        ...prev, 
        { 
          role: "assistant", 
          content: `Ingestion successful! Loaded **${data.fileName}**.\n\nParsed \`${data.pageCount}\` pages into \`${data.chunkCount}\` overlapping semantic chunks. Embeddings generated using \`text-embedding-3-small\` and stored in collection \`${collectionName}\`.` 
        }
      ]);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ingestion workflow encountered an error.");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete document (Live + Sandbox Mode)
  const handleDeleteDoc = async (docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"? This deletes all associated vectors.`)) return;

    if (isSandboxMode) {
      setDocuments(prev => prev.filter(d => d.name !== docName));
      setSelectedDocs(prev => prev.filter(d => d !== docName));
      return;
    }

    try {
      const res = await fetch(`/api/documents?name=${encodeURIComponent(docName)}`, {
        method: "DELETE",
        headers: {
          "x-chroma-url": chromaUrl,
          "x-chroma-collection": collectionName
        }
      });

      if (res.ok) {
        setSelectedDocs(prev => prev.filter(d => d !== docName));
        checkConnectionAndLoadDocs();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete document");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete document from Chroma collection.");
    }
  };

  // Local search simulation for Sandbox Mode
  const getLocalSandboxResponse = (query: string, selectedFilters: string[]) => {
    const normalizedQuery = query.toLowerCase();
    
    // Sandbox Citations
    const handbookCitation: Citation = {
      id: "sandbox-src-1",
      content: "Section 4.2 - Paid Time Off (PTO) & Leave Policy:\nAll full-time employees accrue paid vacation time at a rate of 1.67 days per month, totaling 20 days of paid vacation per calendar year. Vacation requests must be submitted through the portal at least two weeks prior to the requested start date. Unused vacation up to 5 days can carry over to the next year.",
      metadata: {
        source: "Aetheria_Employee_Handbook.pdf",
        page: 12,
        totalPages: 24,
        fileSize: 2450000,
        uploadedAt: new Date().toISOString()
      }
    };

    const remoteWorkCitation: Citation = {
      id: "sandbox-src-2",
      content: "Section 2.1 - Hybrid & Remote Work Framework:\nAetheria operates on a hybrid workspace model. Employees are eligible for up to 3 days of remote work (Work From Home) per week, with Tuesday and Thursday designated as core collaboration days where in-office attendance is required. Core working hours are 10:00 AM to 4:00 PM EST.",
      metadata: {
        source: "Aetheria_Employee_Handbook.pdf",
        page: 6,
        totalPages: 24,
        fileSize: 2450000,
        uploadedAt: new Date().toISOString()
      }
    };

    const securityCitation: Citation = {
      id: "sandbox-src-3",
      content: "Protocol 9.4 - Credentialing & Device Security:\nAll staff accounts must enforce Multi-Factor Authentication (MFA) using authorized authenticator apps. Passwords must be at least 14 characters, combining uppercase, lowercase, numbers, and symbols, and must be updated every 90 days. Staged hardware tokens can be requested from IT Support.",
      metadata: {
        source: "Security_Protocols_2026.pdf",
        page: 4,
        totalPages: 10,
        fileSize: 1220000,
        uploadedAt: new Date().toISOString()
      }
    };

    const hasHandbook = selectedFilters.length === 0 || selectedFilters.includes("Aetheria_Employee_Handbook.pdf");
    const hasSecurity = selectedFilters.length === 0 || selectedFilters.includes("Security_Protocols_2026.pdf");

    if ((normalizedQuery.includes("vacation") || normalizedQuery.includes("leave") || normalizedQuery.includes("holiday") || normalizedQuery.includes("pto")) && hasHandbook) {
      return {
        answer: "Based on **Section 4.2 of the Employee Handbook**, the company vacation policy is structured as follows:\n\n- **Accrual Rate**: Full-time employees accrue paid time off (PTO) at a rate of **1.67 days per month**, which equates to **20 days of paid vacation** per calendar year.\n- **Approval Process**: You must submit your vacation requests through the employee portal at least **two weeks in advance**.\n- **Carry Over Limit**: Up to **5 days** of unused vacation time can be carried over to the next calendar year; any additional accrued days will expire.\n\n*Please refer to the source citation card below to read the exact text segment.*",
        sources: [handbookCitation]
      };
    }
    
    if ((normalizedQuery.includes("remote") || normalizedQuery.includes("wfh") || normalizedQuery.includes("home") || normalizedQuery.includes("hybrid") || normalizedQuery.includes("office")) && hasHandbook) {
      return {
        answer: "According to the **Hybrid Work Framework (Section 2.1)** in the handbook:\n\n- **Hybrid Schedule**: Employees are allowed to work remotely up to **3 days per week**.\n- **Office Core Days**: Tuesdays and Thursdays are designated as **core collaboration days** when all employees must work from the physical office.\n- **Core Hours**: Regardless of working remote or in-office, core hours are **10:00 AM to 4:00 PM EST**.",
        sources: [remoteWorkCitation]
      };
    }

    if ((normalizedQuery.includes("security") || normalizedQuery.includes("password") || normalizedQuery.includes("mfa") || normalizedQuery.includes("access")) && hasSecurity) {
      return {
        answer: "Based on the **Security Protocols (Protocol 9.4)** document, the system access requirements are:\n\n- **Multi-Factor Authentication (MFA)**: MFA must be enabled on all staff accounts using approved authenticator apps.\n- **Password Strength**: Passwords must be at least **14 characters** long and contain a mix of uppercase/lowercase letters, numbers, and special symbols.\n- **Rotation Schedule**: Passwords must be changed every **90 days** to ensure credential integrity.",
        sources: [securityCitation]
      };
    }

    // Default fallback search response
    return {
      answer: "I found references to Aetheria workspace policies in the uploaded documents, but your specific query was not detailed in the core handbook segments.\n\n**To test the RAG citation interface, try asking about:**\n1. `vacation policy` or `leave policy` (retrieves employee handbook context)\n2. `remote work` or `wfh rules` (retrieves hybrid collaboration policy)\n3. `password security` or `MFA` (retrieves device security protocols)\n\n*Currently active sources in RAG context: " + (selectedFilters.length > 0 ? selectedFilters.join(", ") : "All files") + "*",
      sources: hasHandbook ? [handbookCitation] : hasSecurity ? [securityCitation] : []
    };
  };

  // Send Chat message (Live + Sandbox fallback)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatting) return;

    const userMessageContent = input.trim();
    setInput("");
    
    const updatedMessages = [
      ...messages, 
      { role: "user" as const, content: userMessageContent }
    ];
    setMessages(updatedMessages);
    setIsChatting(true);

    // Sandbox offline search simulation
    if (isSandboxMode) {
      setTimeout(() => {
        const sandboxRes = getLocalSandboxResponse(userMessageContent, selectedDocs);
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: sandboxRes.answer,
            sources: sandboxRes.sources
          }
        ]);
        setIsChatting(false);
      }, 1500);
      return;
    }

    // Live query flow
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-key": apiKey,
          "x-chroma-url": chromaUrl,
          "x-chroma-collection": collectionName,
          "x-top-k": String(topK),
          "x-embeddings-provider": embeddingsProvider,
          "x-embeddings-model": embeddingsModel,
          "x-ollama-url": ollamaUrl,
          "x-llm-provider": llmProvider,
          "x-groq-key": groqKey,
          ...(systemPrompt ? { "x-system-prompt": systemPrompt } : {})
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          selectedDocs: selectedDocs,
          modelName: modelName
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Retrieved empty response");
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: err.message || "Failed to run retrieval loop. Check Chroma connectivity or settings configuration.",
          error: true
        }
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  // Toggle document selection
  const handleToggleDocSelect = (docName: string) => {
    setSelectedDocs(prev => 
      prev.includes(docName)
        ? prev.filter(name => name !== docName)
        : [...prev, docName]
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Custom Inline Markdown Renderer for Chat Bubbles
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : "";
        const code = language ? lines.slice(1).join("\n") : lines.join("\n");
        
        return (
          <div key={index} style={{ margin: "14px 0", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)", background: "#06060c" }}>
            <div style={{ padding: "6px 14px", borderBottom: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", textTransform: "uppercase" }}>{language || "code"}</span>
              <FileCode size={12} style={{ color: "var(--text-muted)" }} />
            </div>
            <pre style={{ padding: "14px", overflowX: "auto", margin: 0 }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: "1.5" }}>{code}</code>
            </pre>
          </div>
        );
      }
      
      const lines = part.split("\n");
      return (
        <div key={index} className="markdown-body" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {lines.map((line, lIdx) => {
            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
              const listContent = line.trim().substring(2);
              return (
                <div key={lIdx} style={{ display: "flex", gap: "8px", marginLeft: "8px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--primary-hover)", fontSize: "0.85rem", marginTop: "2px" }}>•</span>
                  <p style={{ fontSize: "0.88rem", margin: 0, color: "var(--text-primary)" }}>{parseInlineFormatting(listContent)}</p>
                </div>
              );
            }
            
            const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
            if (numMatch) {
              return (
                <div key={lIdx} style={{ display: "flex", gap: "8px", marginLeft: "8px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--primary-hover)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700, marginTop: "3px" }}>{numMatch[1]}.</span>
                  <p style={{ fontSize: "0.88rem", margin: 0, color: "var(--text-primary)" }}>{parseInlineFormatting(numMatch[2])}</p>
                </div>
              );
            }

            return line.trim() === "" ? (
              <div key={lIdx} style={{ height: "0.4em" }} />
            ) : (
              <p key={lIdx} style={{ fontSize: "0.88rem", lineHeight: "1.6", margin: 0 }}>{parseInlineFormatting(line)}</p>
            );
          })}
        </div>
      );
    });
  };

  const parseInlineFormatting = (text: string) => {
    const elements: React.ReactNode[] = [];
    let currentText = text;
    let keyIdx = 0;
    
    while (currentText.length > 0) {
      const boldMatch = currentText.match(/\*\*([\s\S]*?)\*\*/);
      const codeMatch = currentText.match(/`([\s\S]*?)`/);
      
      if (boldMatch && (!codeMatch || boldMatch.index! < codeMatch.index!)) {
        const startIdx = boldMatch.index!;
        if (startIdx > 0) {
          elements.push(<span key={keyIdx++}>{currentText.slice(0, startIdx)}</span>);
        }
        elements.push(<strong key={keyIdx++} style={{ color: "#ffffff", fontWeight: 700 }}>{boldMatch[1]}</strong>);
        currentText = currentText.slice(startIdx + boldMatch[0].length);
      } else if (codeMatch) {
        const startIdx = codeMatch.index!;
        if (startIdx > 0) {
          elements.push(<span key={keyIdx++}>{currentText.slice(0, startIdx)}</span>);
        }
        elements.push(<code key={keyIdx++} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.04)", padding: "1px 4px", borderRadius: "4px", color: "var(--secondary-hover)" }}>{codeMatch[1]}</code>);
        currentText = currentText.slice(startIdx + codeMatch[0].length);
      } else {
        elements.push(<span key={keyIdx++}>{currentText}</span>);
        break;
      }
    }
    
    return elements;
  };

  // Filtered documents list
  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Check if LLM/Embeddings configuration is ready
  const needsOpenAI = (llmProvider === "openai" || embeddingsProvider === "openai") && !apiKey;
  const needsGroq = llmProvider === "groq" && !groqKey;
  const isKeyNeeded = needsOpenAI || needsGroq;
  const isReadyToChat = isSandboxMode || !isKeyNeeded;

  const getPlaceholderText = () => {
    if (isSandboxMode) {
      return "Ask about vacation, hybrid work, or passwords...";
    }
    
    const needsOpenAI = (llmProvider === "openai" || embeddingsProvider === "openai") && !apiKey;
    const needsGroq = llmProvider === "groq" && !groqKey;
    
    if (needsOpenAI && needsGroq) {
      return "Enter OpenAI & Groq API Keys in Settings to begin...";
    }
    if (needsOpenAI) {
      return "Enter OpenAI API Key in Settings to begin...";
    }
    if (needsGroq) {
      return "Enter Groq API Key in Settings to begin...";
    }
    
    if (documents.length === 0) {
      return "Upload a document PDF in the sidebar to search...";
    }
    
    return "Ask a question (e.g. 'What is the vacation policy?')...";
  };

  if (!mounted) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: "#020205", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#94a3b8", fontSize: "0.9rem", fontFamily: "var(--font-sans), sans-serif" }} className="shimmer">
          Initializing workspace...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", position: "relative", backgroundColor: "#020205" }}>
      {/* Background aesthetics */}
      <div className="grid-overlay" />
      <div className="ambient-glow glow-purple" />
      <div className="ambient-glow glow-cyan" />
      <div className="ambient-glow glow-pink" />

      {/* Sidebar - Document Base */}
      <aside 
        className="glass-panel" 
        style={{
          width: "330px",
          height: "calc(100vh - 32px)",
          margin: "16px 8px 16px 16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 10,
          border: "1px solid rgba(255,255,255,0.04)"
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: "24px 20px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)" }}>
            <Layers size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "0.5px" }}>AETHERIA RAG</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: isSandboxMode ? "#a855f7" : dbStatus === "connected" ? "var(--success)" : dbStatus === "checking" ? "#eab308" : "var(--danger)" }} />
              <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {isSandboxMode ? "Sandbox Active" : dbStatus === "connected" ? "Chroma Active" : dbStatus === "checking" ? "Checking server..." : "Database offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Upload Form Box */}
        <div style={{ padding: "16px" }}>
          {isUploading ? (
            <div className="glass-card glow-active" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center", border: "1px dashed var(--primary)" }}>
              <RefreshCw size={22} style={{ color: "var(--primary-hover)" }} className="shimmer" />
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fff" }}>{uploadStatus}</div>
              <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ width: "70%", height: "100%", backgroundColor: "var(--primary)" }} className="shimmer" />
              </div>
            </div>
          ) : (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-card ${dragActive ? "glow-active" : ""}`}
              style={{
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                textAlign: "center",
                cursor: "pointer",
                border: "1px dashed rgba(255,255,255,0.08)",
                background: dragActive ? "rgba(139,92,246,0.02)" : "rgba(255,255,255,0.005)"
              }}
            >
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                <Upload size={18} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f1f5f9" }}>Drag PDF here or click</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>Indexed vector splits generated dynamically</div>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>

        {/* Database Search Filter */}
        {documents.length > 0 && (
          <div style={{ padding: "0 16px 12px 16px" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={13} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
              <input 
                type="text"
                placeholder="Search index database..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 30px",
                  fontSize: "0.75rem",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: "8px",
                  color: "#fff",
                  outline: "none"
                }}
              />
            </div>
          </div>
        )}

        {/* Ingested Documents List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", padding: "0 16px 20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.8px" }}>KNOWLEDGE BASE ({documents.length})</span>
            {selectedDocs.length > 0 && (
              <button 
                onClick={() => setSelectedDocs([])}
                style={{ fontSize: "0.65rem", background: "none", border: "none", color: "var(--primary-hover)", cursor: "pointer", fontWeight: 600 }}
              >
                Reset ({selectedDocs.length})
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", textAlign: "center", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px", background: "rgba(255,255,255,0.002)" }}>
              <BookOpen size={24} style={{ color: "var(--text-muted)", marginBottom: "10px" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>No documents uploaded</span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.4" }}>Drag a PDF to extract pages, split overlapping sections, and save embeddings.</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              No matches found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredDocs.map((doc) => {
                const isSelected = selectedDocs.includes(doc.name);
                return (
                  <div 
                    key={doc.name} 
                    className="glass-card" 
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      borderColor: isSelected ? "rgba(139, 92, 246, 0.2)" : "var(--border-color)",
                      background: isSelected ? "rgba(139, 92, 246, 0.02)" : "rgba(255,255,255,0.005)"
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleDocSelect(doc.name)}
                      style={{
                        accentColor: "var(--primary)",
                        cursor: "pointer",
                        width: "14px",
                        height: "14px"
                      }}
                    />
                    <div 
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => handleToggleDocSelect(doc.name)}
                    >
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isSelected ? "#fff" : "var(--text-primary)" }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", gap: "6px", marginTop: "4px", alignItems: "center" }}>
                        <span className="subtle-badge" style={{ padding: "1px 5px", fontSize: "0.6rem" }}>{doc.pages} p.</span>
                        <span className="subtle-badge" style={{ padding: "1px 5px", fontSize: "0.6rem" }}>{doc.chunks} chunks</span>
                        <span>{formatSize(doc.size)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteDoc(doc.name)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "6px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--danger)";
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.background = "none";
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel - Chat Layout */}
      <main 
        style={{
          flex: 1,
          margin: "16px 16px 16px 8px",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 32px)",
          zIndex: 10,
          overflow: "hidden"
        }}
      >
        {/* Header toolbar */}
        <header 
          className="glass-panel" 
          style={{
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isSandboxMode ? "rgba(168, 85, 247, 0.1)" : "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={16} style={{ color: isSandboxMode ? "#c084fc" : "var(--primary-hover)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                {isSandboxMode ? "Offline Sandbox Workspace" : "Semantic Intelligence Workspace"}
              </h2>
              {selectedDocs.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span className="subtle-badge subtle-badge-primary">Focus: {selectedDocs.length} target doc(s)</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>retrievals restricted</span>
                </div>
              ) : (
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {isSandboxMode ? "Running offline sandbox simulation" : "Indexing all vector spaces"}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Sandbox workspace toggle */}
            <button 
              onClick={() => setSandboxMode(!isSandboxMode)}
              style={{
                background: isSandboxMode ? "rgba(168, 85, 247, 0.15)" : "rgba(255, 255, 255, 0.02)",
                border: isSandboxMode ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(255,255,255,0.04)",
                color: isSandboxMode ? "#e9d5ff" : "var(--text-secondary)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Sparkles size={13} style={{ color: isSandboxMode ? "#c084fc" : "var(--text-muted)" }} />
              {isSandboxMode ? "Sandbox Active" : "Try Sandbox Mode"}
            </button>

            {!isSandboxMode && (
              <>
                {isKeyNeeded && (
                  <span className="subtle-badge" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Key size={11} /> API Key Needed
                  </span>
                )}
                
                <button 
                  onClick={() => checkConnectionAndLoadDocs()}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    color: "var(--text-secondary)",
                    borderRadius: "8px",
                    padding: "8px",
                    cursor: "pointer",
                    display: "flex"
                  }}
                  title="Sync Collections"
                >
                  <RefreshCw size={14} className={dbStatus === "checking" ? "shimmer" : ""} />
                </button>
              </>
            )}

            <button 
              onClick={() => setShowSettings(true)}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
                color: "var(--text-secondary)",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Settings size={13} /> Settings
            </button>
          </div>
        </header>

        {/* Database Warning or Sandbox Prompter */}
        {dbStatus === "disconnected" && !isSandboxMode && (
          <div style={{ margin: "0 0 12px 0", padding: "12px 20px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={14} style={{ color: "var(--danger)" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Could not connect to local database server (port 8000). Run `python run_chroma.py` or switch to sandbox mode.
              </span>
            </div>
            <button 
              onClick={() => setSandboxMode(true)}
              style={{
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                color: "#e9d5ff",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Switch to Sandbox Mode
            </button>
          </div>
        )}

        {/* Sandbox active prompt banner */}
        {isSandboxMode && (
          <div style={{ margin: "0 0 12px 0", padding: "12px 20px", borderRadius: "12px", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", gap: "10px", zIndex: 10 }}>
            <Sparkles size={14} style={{ color: "#c084fc" }} />
            <span style={{ fontSize: "0.78rem", color: "#e9d5ff" }}>
              **Sandbox Workspace Active**: Try asking about **“vacation policy”**, **“hybrid schedule”**, or **“MFA passwords”** to see simulated semantic citations.
            </span>
          </div>
        )}

        {/* Message Log */}
        <section 
          ref={chatContainerRef}
          className="glass-panel" 
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "12px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.04)"
          }}
        >
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className="animate-fade-in"
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: "12px"
              }}
            >
              {msg.role === "assistant" && (
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))", border: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Sparkles size={12} style={{ color: "var(--primary-hover)" }} />
                </div>
              )}

              <div 
                className={msg.role === "user" ? "" : "glass-card"}
                style={{
                  maxWidth: "75%",
                  padding: "16px 20px",
                  borderRadius: "16px",
                  ...(msg.role === "user" ? {
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    color: "#ffffff",
                    boxShadow: "0 8px 25px rgba(124, 58, 237, 0.15)",
                    border: "1px solid rgba(255,255,255,0.08)"
                  } : {
                    background: msg.error ? "rgba(239, 68, 68, 0.02)" : "rgba(255, 255, 255, 0.005)",
                    borderColor: msg.error ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    borderLeft: msg.error ? "3px solid var(--danger)" : "3px solid var(--primary)"
                  })
                }}
              >
                {/* Content */}
                <div>
                  {msg.role === "assistant" ? renderContent(msg.content) : (
                    <p style={{ fontSize: "0.88rem", lineHeight: "1.6", margin: 0 }}>{msg.content}</p>
                  )}
                </div>

                {/* Citation references list */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <CornerDownRight size={10} style={{ color: "var(--text-muted)" }} />
                      <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.8px" }}>RETRIEVED VECTOR CONTEXTS</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {msg.sources.map((src, sIdx) => (
                        <button
                          key={src.id}
                          onClick={() => setActiveCitation(src)}
                          style={{
                            background: "rgba(255, 255, 255, 0.015)",
                            border: "1px solid rgba(255,255,255,0.04)",
                            borderRadius: "6px",
                            padding: "5px 10px",
                            fontSize: "0.68rem",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-hover)";
                            e.currentTarget.style.background = "rgba(139, 92, 246, 0.05)";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.015)";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }}
                        >
                          <FileText size={10} style={{ color: "var(--primary-hover)" }} />
                          <span>[{sIdx + 1}] {src.metadata.source} (p. {src.metadata.page})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isChatting && (
            <div style={{ display: "flex", justifyContent: "flex-start", gap: "12px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={12} style={{ color: "var(--primary-hover)" }} className="shimmer" />
              </div>
              <div 
                className="glass-card" 
                style={{
                  maxWidth: "50%",
                  padding: "16px 20px",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderLeft: "3px solid var(--secondary)"
                }}
              >
                <div style={{ display: "flex", gap: "4px" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "var(--primary)", borderRadius: "50%" }} className="typing-dot" />
                  <div style={{ width: "6px", height: "6px", backgroundColor: "var(--primary)", borderRadius: "50%" }} className="typing-dot" />
                  <div style={{ width: "6px", height: "6px", backgroundColor: "var(--primary)", borderRadius: "50%" }} className="typing-dot" />
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {isSandboxMode ? "Retrieving matching vector segments..." : "Searching vectors & assembling context..."}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Input Bar Form */}
        <footer className="glass-panel" style={{ padding: "16px 20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
          <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "12px" }}>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getPlaceholderText()}
              disabled={!isReadyToChat || isChatting}
              style={{
                flex: 1,
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "10px",
                padding: "12px 18px",
                fontSize: "0.85rem",
                color: "#ffffff",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.04)"}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isChatting || !isReadyToChat}
              style={{
                background: "linear-gradient(135deg, var(--primary), #6366f1)",
                border: "none",
                borderRadius: "10px",
                padding: "12px 22px",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: (!input.trim() || isChatting || !isReadyToChat) ? 0.4 : 1,
                boxShadow: "0 4px 15px rgba(139, 92, 246, 0.15)"
              }}
            >
              <Send size={14} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Query</span>
            </button>
          </form>
        </footer>
      </main>

      {/* Settings Modal - Slide-in Panel */}
      {showSettings && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(5px)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 100
          }}
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="glass-panel"
            style={{
              width: "440px",
              height: "100%",
              borderRadius: "0",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              overflowY: "auto",
              boxShadow: "-10px 0 50px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sliders size={18} style={{ color: "var(--primary-hover)" }} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>RAG System Config</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
              {/* Providers Selection */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>LLM PROVIDER</label>
                  <select 
                    value={llmProvider}
                    onChange={(e) => {
                      setLlmProvider(e.target.value);
                      if (e.target.value === "groq") setModelName("llama-3.1-70b-versatile");
                      else if (e.target.value === "ollama") setModelName("gemma2:2b");
                      else setModelName("gpt-4o");
                    }}
                    disabled={isSandboxMode}
                    style={{
                      background: "#07070d",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      color: isSandboxMode ? "var(--text-muted)" : "#fff",
                      outline: "none",
                      cursor: isSandboxMode ? "not-allowed" : "pointer"
                    }}
                  >
                    <option value="openai">OpenAI (Cloud)</option>
                    <option value="groq">Groq (Free Cloud)</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>EMBEDDINGS</label>
                  <select 
                    value={embeddingsProvider}
                    onChange={(e) => {
                      setEmbeddingsProvider(e.target.value);
                      if (e.target.value === "ollama") setEmbeddingsModel("nomic-embed-text");
                      else setEmbeddingsModel("text-embedding-3-small");
                    }}
                    disabled={isSandboxMode}
                    style={{
                      background: "#07070d",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      color: isSandboxMode ? "var(--text-muted)" : "#fff",
                      outline: "none",
                      cursor: isSandboxMode ? "not-allowed" : "pointer"
                    }}
                  >
                    <option value="openai">OpenAI (Cloud)</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>
              </div>

              {/* API Keys and Endpoint Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px" }}>
                {/* OpenAI Key */}
                {(llmProvider === "openai" || embeddingsProvider === "openai") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>OPENAI API KEY</label>
                    <input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      disabled={isSandboxMode}
                      style={{
                        background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "0.85rem",
                        color: isSandboxMode ? "var(--text-muted)" : "#fff",
                        outline: "none"
                      }}
                    />
                  </div>
                )}

                {/* Groq Key */}
                {llmProvider === "groq" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>GROQ API KEY</label>
                    <input 
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      disabled={isSandboxMode}
                      style={{
                        background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "0.85rem",
                        color: isSandboxMode ? "var(--text-muted)" : "#fff",
                        outline: "none"
                      }}
                    />
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                      Get a free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-hover)" }}>console.groq.com</a>
                    </span>
                  </div>
                )}

                {/* Ollama URL */}
                {(llmProvider === "ollama" || embeddingsProvider === "ollama") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>OLLAMA SERVICE URL</label>
                    <input 
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      disabled={isSandboxMode}
                      style={{
                        background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "0.85rem",
                        color: isSandboxMode ? "var(--text-muted)" : "#fff",
                        outline: "none"
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Models selection section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px" }}>
                {/* LLM Model selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>LLM CHAT MODEL</label>
                  {llmProvider === "openai" ? (
                    <select 
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      disabled={isSandboxMode}
                      style={{
                        background: "#07070d",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "0.85rem",
                        color: isSandboxMode ? "var(--text-muted)" : "#fff",
                        outline: "none",
                        cursor: isSandboxMode ? "not-allowed" : "pointer"
                      }}
                    >
                      <option value="gpt-4o">gpt-4o (Premium Multi-modal)</option>
                      <option value="gpt-4-turbo">gpt-4-turbo (Advanced reasoning)</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo (Hyper-fast / Cheap)</option>
                    </select>
                  ) : llmProvider === "groq" ? (
                    <select 
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      disabled={isSandboxMode}
                      style={{
                        background: "#07070d",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "0.85rem",
                        color: isSandboxMode ? "var(--text-muted)" : "#fff",
                        outline: "none",
                        cursor: isSandboxMode ? "not-allowed" : "pointer"
                      }}
                    >
                      <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile (Smart / Free)</option>
                      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast / Free)</option>
                      <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Mixture of Experts)</option>
                      <option value="gemma2-9b-it">gemma2-9b-it (Google Gemma 2)</option>
                    </select>
                  ) : (
                    <input 
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g. gemma2:2b, llama3, mistral"
                      disabled={isSandboxMode}
                      style={{
                        background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "0.85rem",
                        color: isSandboxMode ? "var(--text-muted)" : "#fff",
                        outline: "none"
                      }}
                    />
                  )}
                </div>

                {/* Embeddings model name */}
                {embeddingsProvider === "ollama" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>LOCAL EMBEDDING MODEL</label>
                    <input 
                      type="text"
                      value={embeddingsModel}
                      onChange={(e) => setEmbeddingsModel(e.target.value)}
                      placeholder="e.g. nomic-embed-text"
                      disabled={isSandboxMode}
                      style={{
                        background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "0.85rem",
                        color: isSandboxMode ? "var(--text-muted)" : "#fff",
                        outline: "none"
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Chroma URL, Collection Name, and Top K parameters */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px" }}>
                {/* Chroma URL */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>CHROMADB API ENDPOINT</label>
                  <input 
                    type="text"
                    value={chromaUrl}
                    onChange={(e) => setChromaUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    disabled={isSandboxMode}
                    style={{
                      background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      color: isSandboxMode ? "var(--text-muted)" : "#fff",
                      outline: "none"
                    }}
                  />
                </div>

                {/* Collection */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>VECTOR DATABASE COLLECTION</label>
                  <input 
                    type="text"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    disabled={isSandboxMode}
                    style={{
                      background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "0.85rem",
                      color: isSandboxMode ? "var(--text-muted)" : "#fff",
                      outline: "none"
                    }}
                  />
                </div>

                {/* Slider: Top K */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.6px" }}>RETRIEVED VECTOR LIMIT (K): {topK}</label>
                  <input 
                    type="range"
                    min="1"
                    max="10"
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                    disabled={isSandboxMode}
                    style={{
                      accentColor: "var(--primary)",
                      cursor: isSandboxMode ? "not-allowed" : "pointer",
                      marginTop: "4px"
                    }}
                  />
                </div>
              </div>

              {/* System prompt */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.8px" }}>CUSTOM AGENT SYSTEM PROMPT</label>
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Set base behavioral logic..."
                  rows={4}
                  disabled={isSandboxMode}
                  style={{
                    background: isSandboxMode ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.25)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.8rem",
                    color: isSandboxMode ? "var(--text-muted)" : "#fff",
                    outline: "none",
                    resize: "none"
                  }}
                />
              </div>

              {/* Form buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <button 
                  type="button" 
                  onClick={() => setShowSettings(false)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    color: "var(--text-secondary)",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 700
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSandboxMode}
                  style={{
                    flex: 1,
                    background: isSandboxMode ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, var(--primary), #6366f1)",
                    border: "none",
                    color: isSandboxMode ? "var(--text-muted)" : "#fff",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: isSandboxMode ? "not-allowed" : "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    boxShadow: isSandboxMode ? "none" : "0 4px 15px rgba(139, 92, 246, 0.2)"
                  }}
                >
                  Apply Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Citation Viewer Modal */}
      {activeCitation && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100
          }}
          onClick={() => setActiveCitation(null)}
        >
          <div 
            className="glass-panel"
            style={{
              width: "640px",
              maxWidth: "92%",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
              border: "1px solid rgba(255,255,255,0.06)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveCitation(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "14px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={16} style={{ color: "var(--secondary-hover)" }} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>Citation Segment Inspector</h4>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {activeCitation.metadata.source} — Page {activeCitation.metadata.page} of {activeCitation.metadata.totalPages}
                </p>
              </div>
            </div>

            <div 
              style={{
                background: "#050508",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "10px",
                padding: "18px",
                fontSize: "0.85rem",
                lineHeight: "1.65",
                color: "#e2e8f0",
                maxHeight: "340px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-sans)"
              }}
            >
              {activeCitation.content}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "14px" }}>
              <span className="subtle-badge">File Size: {formatSize(activeCitation.metadata.fileSize || 0)}</span>
              <span>Semantic Similarity Retrieval Hit</span>
            </div>

            <button 
              onClick={() => setActiveCitation(null)}
              style={{
                background: "linear-gradient(135deg, var(--primary), #6366f1)",
                border: "none",
                color: "#fff",
                borderRadius: "8px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 700,
                alignSelf: "flex-end",
                boxShadow: "0 4px 15px rgba(139, 92, 246, 0.15)"
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
