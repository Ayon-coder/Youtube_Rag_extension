from youtube_transcript_api import YouTubeTranscriptApi
from langchain_classic.schema import Document
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter

def generating(video_id):
    new_docs = []
    try:
        transcript = YouTubeTranscriptApi().fetch(video_id)

        text = "\n".join(
                f"[{item.start:.2f}] {item.text}"
                for item in transcript
            )
            
        text = (
        text.replace("\u200b", "")
            .replace("\u200c", "")
            .replace("\u200d", "")
            .replace("\ufeff", "")
    )

        docs = Document(
            page_content=text,
            metadata={
                "source": "Youtube",
                "video_id": video_id
            }
        )

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

        new_docs = splitter.split_documents([docs])

    except Exception as e:
        # Keep behavior visible for debugging but return an empty list instead of raising
        print(type(e).__name__)
        print(e)
        new_docs = []

    return new_docs