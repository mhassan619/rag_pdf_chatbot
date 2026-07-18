"""
IntellectRAG Engine — FastAPI Serverless Backend
Vercel Serverless Entry Point
"""
import os
import tempfile
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
load_dotenv()
app = FastAPI(
    title="IntellectRAG Engine API",
    description="Production RAG Pipeline powered by Groq + LangChain + ChromaDB",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# In-memory store for uploaded document chunks
document_store: dict = {"chunks": [], "initialized": False}
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "operational",
        "engine": "IntellectRAG v1.0",
        "model": "Llama 3.1 via Groq",
        "vector_store": "ChromaDB (Ephemeral)",
    }
@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF document, chunk it, and store vectors in-memory.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        contents = await file.read()
        tmp_path = os.path.join(tempfile.gettempdir(), file.filename)
        with open(tmp_path, "wb") as f:
            f.write(contents)
        # Lazy imports to keep cold starts fast
        from pypdf import PdfReader
        reader = PdfReader(tmp_path)
        text_chunks = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                clean_text = text.encode('utf-8',errors='ignore').decode('utf-8',errors='ignore')

                # Simple chunking by paragraphs
                paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]
                if not paragraphs:
                    chunk_size = 1000
                    paragraphs = [clean_text[i:i+chunk_size].strip() for i in range(0, len(clean_text),chunk_size)]
                text_chunks.extend(paragraphs)
        document_store["chunks"] = text_chunks
        document_store["initialized"] = True
        os.remove(tmp_path)
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_created": len(text_chunks),
            "message": f"Document '{file.filename}' processed successfully with {len(text_chunks)} chunks.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
@app.post("/api/chat")
async def chat(
    question: str = Form(...),
    history: str = Form(default="[]"),
):
    """
    Accept a question, retrieve relevant context from vector store,
    and generate a response using Groq LLM.
    """
    try:
        chat_history = json.loads(history)
    except json.JSONDecodeError:
        chat_history = []
    if not document_store["initialized"]:
        return {
            "answer": "Please upload a document first so I can help you with context-aware answers.",
            "sources": [],
            "status": "no_context",
        }
    try:
        # For demo: simple keyword search over chunks
        relevant_chunks = []
        q_lower = question.lower()
        for chunk in document_store["chunks"]:
            if any(word in chunk.lower() for word in q_lower.split()):
                relevant_chunks.append(chunk)
        relevant_chunks = relevant_chunks[:5]  # Top 5
        context = "\n\n".join(relevant_chunks) if relevant_chunks else "No relevant context found."
        # Groq API call via LangChain
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            return {
                "answer": f"Based on your document, here's what I found:\n\n{context}\n\n*Note: Set GROQ_API_KEY for AI-powered responses.*",
                "sources": relevant_chunks[:3],
                "status": "fallback",
            }
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage, SystemMessage
        llm = ChatGroq(
            model = "llama-3.3-70b-versatile",
            api_key=groq_api_key,
            temperature=0.2,
            max_tokens=1024,
        )
        messages = [
            SystemMessage(content=(
                "You are IntellectRAG, an intelligent document assistant. Your ONLY job is to answer the question based strictly on the provided context.\n\n"
                "Rules:\n"
                "1. If the answer to the question cannot be found in the provided context, you MUST reply with exactly: 'I cannot find this information in the uploaded document.'\n"
                "2. Do NOT use your own external knowledge or assumptions under any circumstances.\n"
                "3. Do NOT answer general knowledge questions, current affairs, or anything outside the context.\n\n"
                f"CONTEXT:\n{context}"
                )),
            HumanMessage(content=question),
        ]
        response = llm.invoke(messages)
        return {
            "answer": response.content,
            "sources": relevant_chunks[:3],
            "status": "success",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
@app.get("/api/status")
async def get_status():
    """Return current document processing status."""
    return {
        "document_loaded": document_store["initialized"],
        "total_chunks": len(document_store["chunks"]),
    }
