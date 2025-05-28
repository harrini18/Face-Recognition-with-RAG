import os
import logging
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEndpoint
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from huggingface_hub import login

# Configure logging
logging.basicConfig(
    filename='app.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logging.debug("Loading llm.py module")

# Load environment variables
load_dotenv()

def initialize_llm_chain(vector_store):
    try:
        logging.debug("Initializing LLM chain...")

        # Authenticate with Hugging Face
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
            token_path = os.path.expanduser("~/.cache/huggingface/token")
            if os.path.exists(token_path):
                with open(token_path, 'r') as f:
                    hf_token = f.read().strip()
                logging.debug("HF_TOKEN loaded from Hugging Face CLI cache")
            else:
                logging.warning("HF_TOKEN not found. LLM chain will not be initialized.")
                return None
        logging.debug(f"HF_TOKEN loaded (first 4 chars): {hf_token[:4]}...")
        login(token=hf_token)
        logging.debug("Logged in to Hugging Face.")

        # Set up prompt template
        prompt_template = """Given the following context about registered users, answer the question concisely. If the answer is not in the context, state that clearly.

Context: {context}

Question: {question}

Answer: """
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )

        # Initialize Hugging Face LLM
        llm = HuggingFaceEndpoint(
            repo_id="facebook/bart-large",
            task="text2text-generation",
            max_new_tokens=100,
            temperature=0.6,
            top_p=0.85,
            huggingfacehub_api_token=hf_token
        )
        logging.debug("Hugging Face API for BART initialized.")

        # Create RetrievalQA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 1}
            ),
            chain_type_kwargs={"prompt": prompt},
            return_source_documents=True
        )
        logging.debug("LLM chain initialized successfully.")
        return qa_chain
    except Exception as e:
        logging.error(f"Failed to initialize LLM chain: {str(e)}")
        return None