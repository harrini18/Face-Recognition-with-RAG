import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Configure logging
logging.basicConfig(
    filename='app.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# MongoDB connection
def get_mongo_client():
    try:
        client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
        client.server_info()
        logging.info("RAG engine connected to MongoDB")
        return client
    except ConnectionFailure as e:
        logging.error(f"RAG MongoDB connection failed: {str(e)}")
        raise

# Initialize RAG
def initialize_rag():
    try:
        client = get_mongo_client()
        db = client['facial_recognition_db']
        users_collection = db['users']
        logging.info("RAG system initialized successfully")
        # Placeholder for indexing user data if needed
    except Exception as e:
        logging.error(f"RAG initialization failed: {str(e)}")
        raise

# Query RAG
def query_rag(prompt):
    try:
        client = get_mongo_client()
        db = client['facial_recognition_db']
        users_collection = db['users']
        # Simple query to retrieve users based on name or ID
        results = list(users_collection.find(
            {"name": {"$regex": prompt, "$options": "i"}},
            {"user_id": 1, "name": 1, "_id": 0}
        ))
        return {
            "response": f"Found {len(results)} matching users for query: {prompt}",
            "data": results
        }
    except Exception as e:
        logging.error(f"RAG query failed: {str(e)}")
        return {"error": f"RAG query failed: {str(e)}"}

if __name__ == '__main__':
    try:
        logging.debug("Testing RAG initialization...")
        initialize_rag()
        logging.debug("Testing RAG query...")
        result = query_rag("test")
        logging.debug(f"Query result: {result}")
    except Exception as e:
        logging.error(f"RAG test failed: {str(e)}")