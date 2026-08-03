from vector_store import storing

def build_retriever(video_id, caption_text=None):
    vector_store = storing(video_id, caption_text)

    return vector_store.as_retriever(
        search_kwargs = {'k': 5}
    )