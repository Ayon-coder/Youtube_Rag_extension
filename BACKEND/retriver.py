from vector_store import storing

def build_retriever(video_id):
    vector_store = storing(video_id)

    return vector_store.as_retriever(
        search_kwargs = {'k': 5}
    )