# Aetheria RAG

A local Retrieval-Augmented Generation (RAG) search and QA application. Upload your PDF documents, chunk and index them into a local vector database, and ask questions with precise, page-aware citations.

You can run this completely locally and free using **Ollama** (Gemma 2 / Nomic Embed) or **Groq**, as well as **OpenAI** if you have an API key.

## Features

- **Local Vector Database**: Uses ChromaDB running locally to store and query document chunks.
- **Dynamic Context Search**: Focus your search by selecting specific documents in the sidebar.
- **Citations & Inspector**: Every answer includes page-level citations. Clicking a citation opens a modal showing the exact text chunk retrieved from the PDF.
- **Flexible Settings**: Toggle between OpenAI, Groq, and local Ollama. Adjust chunk size, retrieval limit (K), and system prompts on the fly.
- **Sleek Interface**: A clean dark-mode UI with smooth micro-animations, glassmorphic panels, and a custom inline markdown renderer.

---

## Getting Started

### Prerequisites
- Python 3.10+ (for ChromaDB)
- Node.js 18+

### 1. Clone & Install
```bash
git clone https://github.com/harsharaju1314-hash/rag-knowledge-base.git
cd rag-knowledge-base
npm install --legacy-peer-deps
```

### 2. Start ChromaDB
The project has a helper script to automatically install ChromaDB and boot the server locally:
```bash
python run_chroma.py
```
*This runs ChromaDB on `http://localhost:8000` and saves vector files in `./chroma_data`.*

### 3. Run the App
Start the Next.js development server:
```bash
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## Running 100% Free & Local (Ollama)

If you don't want to pay for OpenAI API tokens, you can run everything offline on your own machine:

1. Install [Ollama](https://ollama.com/).
2. Pull the embedding and LLM models:
   ```bash
   ollama pull nomic-embed-text
   ollama pull gemma2:2b
   ```
3. Open the **Settings** panel in the app:
   - Select **Ollama (Local)** as the LLM Provider, and set your model to `gemma2:2b`.
   - Select **Ollama (Local)** as the Embeddings Provider, and set your model to `nomic-embed-text`.
   - Ensure the service URL matches `http://localhost:11434`.

*(You can also use **Groq** by entering your free Groq API key in Settings and selecting a model like `llama-3.1-70b-versatile`)*

---

## Under the Hood

- **Frontend/Backend**: Next.js (App Router) & TypeScript.
- **LLM/RAG Pipeline**: LangChain.js to handle loading, chunking, and querying.
- **Vector Database**: ChromaDB.
- **Styling**: Vanilla CSS for complete control over styling, custom animations, and layout transitions.
- **Chunking Strategy**: Defaults to `1000` characters with a `200` character overlap to preserve context across splits.
