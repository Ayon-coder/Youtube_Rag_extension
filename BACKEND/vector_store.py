from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from caption_gen import generating
from dotenv import load_dotenv
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec
import os

load_dotenv()

pc = Pinecone()
index_name = "youtube-rag"
embedding_model = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-2-preview",
    output_dimensionality=768
)

if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=768,      # Change according to your embedding model
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

index = pc.Index(index_name)


def storing(video_id):

    vector_store = PineconeVectorStore(
        index=index,
        embedding=embedding_model,
        namespace=video_id
    )

    # Skip if this video is already indexed
    stats = index.describe_index_stats()
    ns_count = stats.get('namespaces', {}).get(video_id, {}).get('vector_count', 0)

    if ns_count > 0:
        return vector_store

    # Clean up old video namespaces before indexing new one
    for ns_name in list(stats.get('namespaces', {}).keys()):
        if ns_name != video_id:
            try:
                index.delete(delete_all=True, namespace=ns_name)
            except Exception:
                pass

    docs = generating(video_id)
    vector_store.add_documents(docs)

    return vector_store