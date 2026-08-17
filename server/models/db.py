from pymongo import MongoClient, ASCENDING, DESCENDING
import logging
from config import Config

logger = logging.getLogger(__name__)

client = None
db = None

def init_db(app=None):
    global client, db
    try:
        uri = Config.MONGO_URI
        # Connect to MongoDB with timeout
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Parse database name from URI or default
        db_name = uri.split("/")[-1].split("?")[0] if "/" in uri else "college_coding_db"
        if not db_name or db_name == "localhost:27017":
            db_name = "college_coding_db"
        db = client[db_name]
        
        # Ping the server
        client.admin.command('ping')
        logger.info(f"Connected successfully to MongoDB database: {db_name}")
        
        # Ensure indexes for query performance & uniqueness
        setup_indexes(db)
        return db
    except Exception as e:
        logger.warning(f"MongoDB connection warning: {e}. If MongoDB is not running locally, make sure to set MONGO_URI in .env")
        # MongoClient deliberately does not support truth-value testing.
        # Checking `if client` here can replace the original connection error
        # with a second exception and turn every auth request into HTTP 500.
        if client is not None:
            db = client["college_coding_db"]
        return db

def setup_indexes(database):
    try:
        # Users indexes
        database.users.create_index([("student_id", ASCENDING)], unique=True, sparse=True)
        database.users.create_index([("email", ASCENDING)], unique=True, sparse=True)
        database.users.create_index([("role", ASCENDING)])
        
        # Problems indexes
        database.problems.create_index([("slug", ASCENDING)], unique=True, sparse=True)
        database.problems.create_index([("difficulty", ASCENDING)])
        database.problems.create_index([("topic", ASCENDING)])
        
        # Submissions indexes
        database.submissions.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        database.submissions.create_index([("problem_id", ASCENDING)])
        database.submissions.create_index([("status", ASCENDING)])
        
        # MCQs indexes
        database.mcqs.create_index([("topic", ASCENDING)])
        database.mcqs.create_index([("difficulty", ASCENDING)])
        
        # Contests indexes
        database.contests.create_index([("is_published", ASCENDING), ("start_time", ASCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
        database.contest_participants.create_index([("contest_id", ASCENDING), ("student_id", ASCENDING)])
        database.contest_assigned_questions.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
        database.contest_assigned_questions.create_index([("contest_id", ASCENDING), ("student_id", ASCENDING)])
        database.contest_submissions.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING)])
    except Exception as e:
        logger.warning(f"Index creation notice: {e}")

def get_db():
    global db
    if db is None:
        return init_db()
    return db
