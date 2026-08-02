from langchain_core.prompts import PromptTemplate

prompt = PromptTemplate(
    template="""You are a helpful AI assistant.

        Answer only using the provided context.

        If the answer is not in the context, say:
        "I couldn't find that information in the provided documents."

        Context:
        {context}

        Question:
        {input}""",
        input_variables=['context', 'input']
)