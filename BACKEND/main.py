from prompt import prompt
from retriver import build_retriever
from langchain_groq  import ChatGroq
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

parser = StrOutputParser()

model = ChatGroq(
    model = 'llama-3.1-8b-instant'
)

def model_invoke(query, retriever):

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    chain = (
        {
            "context": retriever | RunnableLambda(format_docs),
            "input": RunnablePassthrough(),
        }
        | prompt
        | model
        | parser
    )
    return chain.invoke(query)

if __name__ == '__main__':
    video_id = input("Enter YouTube video ID: ")
    retriever = build_retriever(video_id)

    while True:
        query = input("Enter your question: ")
        if query == 'exit':
            break
        print(model_invoke(query, retriever))

