from langchain_classic.schema import Document
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter

def generating(video_id, caption_text):
    docs = Document(
        page_content=caption_text,
        metadata={
            "source": "Youtube",
            "video_id": video_id
        }
    )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    return splitter.split_documents([docs])
