from langchain_classic.schema import Document
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter
import requests
import yt_dlp

def generating(video_id):
    new_docs = []
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"

        with yt_dlp.YoutubeDL({"skip_download": True}) as ydl:
            info = ydl.extract_info(url, download=False)

        captions = info.get("subtitles") or info.get("automatic_captions")

        if not captions or "en" not in captions:
            print("No English captions found")
            exit()

        caption_url = captions["en"][0]["url"]

        data = requests.get(caption_url).json()

        text = " ".join(
            seg["utf8"]
            for event in data["events"]
            for seg in event.get("segs", [])
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

print(generating("l0bj4ZZFQTY"))