from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from retriver import build_retriever
from main import model_invoke
from vector_store import index, embedding_model
from langchain_pinecone import PineconeVectorStore
from dotenv import load_dotenv
import os
import threading
import time
import urllib.request

load_dotenv()

# ---------- Keep-alive self-ping ----------

def _keep_alive():
    """Ping own /health every 5 min to prevent free-tier sleep on Render."""
    self_url = os.getenv("RENDER_EXTERNAL_URL") # Render automatically sets this
    if not self_url:
        return
    while True:
        time.sleep(300)  # 5 minutes
        try:
            urllib.request.urlopen(f"{self_url}/health", timeout=10)
        except Exception:
            pass

# ---------- App ----------

app = FastAPI(title="Ask This Video API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    thread = threading.Thread(target=_keep_alive, daemon=True)
    thread.start()


class PrepareRequest(BaseModel):
    video_id: str


class AskRequest(BaseModel):
    video_id: str
    question: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/prepare")
def prepare(req: PrepareRequest):
    """Index a video's transcript into Pinecone.
    Frontend polls this every 9s until it returns 'ready'.
    If already indexed, returns instantly."""
    try:
        stats = index.describe_index_stats()
        ns_count = stats.get('namespaces', {}).get(req.video_id, {}).get('vector_count', 0)

        if ns_count > 0:
            return {"status": "ready"}

        build_retriever(req.video_id)
        return {"status": "ready"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask")
def ask(req: AskRequest):
    """Answer a question about an already-prepared video.
    Lightweight — just retrieves from Pinecone + LLM call. No indexing."""
    try:
        vs = PineconeVectorStore(
            index=index,
            embedding=embedding_model,
            namespace=req.video_id
        )
        retriever = vs.as_retriever(search_kwargs={'k': 5})
        answer = model_invoke(req.question, retriever)
        return {"answer": answer}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
