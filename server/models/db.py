from pymongo import MongoClient, ASCENDING, DESCENDING
import logging
from config import Config

logger = logging.getLogger(__name__)

client = None
db = None
_indexes_initialized = False

def init_db(app=None):
    global client, db, _indexes_initialized
    if db is not None:
        return db
    try:
        uri = Config.MONGO_URI
        # Connect to MongoDB with production connection pooling for 3000+ users
        client = MongoClient(
            uri,
            maxPoolSize=100,
            minPoolSize=10,
            maxIdleTimeMS=45000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            retryWrites=True,
            retryReads=True
        )
        # Parse database name from URI or default
        db_name = uri.split("/")[-1].split("?")[0] if "/" in uri else "college_coding_db"
        if not db_name or db_name == "localhost:27017":
            db_name = "college_coding_db"
        db = client[db_name]
        
        # Ping the server
        client.admin.command('ping')
        logger.info(f"Connected successfully to MongoDB database: {db_name} (Pool size: min=10, max=100)")
        
        # Ensure indexes once on startup
        if not _indexes_initialized:
            setup_indexes(db)
            _indexes_initialized = True
        return db
    except Exception as e:
        logger.warning(f"MongoDB connection warning: {e}. If MongoDB is not running locally, make sure to set MONGO_URI in .env")
        if client is not None:
            db = client["college_coding_db"]
        return db

def setup_indexes(database):
    """Setup high-performance single and compound indexes for high concurrency (3,000+ users)."""
    try:
        # Users indexes for high-speed authentication lookups (<1ms)
        database.users.create_index([("student_id", ASCENDING)], unique=True, sparse=True, background=True)
        database.users.create_index([("email", ASCENDING)], unique=True, sparse=True, background=True)
        database.users.create_index([("username", ASCENDING)], unique=True, sparse=True, background=True)
        database.users.create_index([("role", ASCENDING)], background=True)
        database.users.create_index([("email", ASCENDING), ("role", ASCENDING)], background=True)
        database.users.create_index([("username", ASCENDING), ("role", ASCENDING)], background=True)
        database.users.create_index([("student_id", ASCENDING), ("role", ASCENDING)], background=True)
        
        # Problems indexes
        database.problems.create_index([("slug", ASCENDING)], unique=True, sparse=True, background=True)
        database.problems.create_index([("difficulty", ASCENDING)], background=True)
        database.problems.create_index([("topic", ASCENDING)], background=True)
        
        # Submissions indexes
        database.submissions.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], background=True)
        database.submissions.create_index([("user_id", ASCENDING), ("problem_id", ASCENDING), ("status", ASCENDING)], background=True)
        database.submissions.create_index([("problem_id", ASCENDING), ("status", ASCENDING)])
        # Queue-related indexes: fast polling for QUEUED/PROCESSING submissions
        database.submissions.create_index([("status", ASCENDING), ("created_at", ASCENDING)])
        database.submissions.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
        
        # MCQs indexes
        database.mcqs.create_index([("topic", ASCENDING)])
        database.mcqs.create_index([("difficulty", ASCENDING)])
        database.mcqs.create_index([("type", ASCENDING)])
        
        # Contests indexes
        database.contests.create_index([("is_published", ASCENDING), ("start_time", ASCENDING), ("end_time", ASCENDING)])
        
        # Contest participants are stored per attempt, so a student can have
        # multiple historical attempts for the same contest.
        try:
            database.contest_participants.drop_index("contest_id_1_user_id_1")
        except Exception:
            pass
        database.contest_participants.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING), ("attempt_number", DESCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("student_id", ASCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("score", DESCENDING), ("submitted_at", ASCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("is_active_attempt", ASCENDING), ("score", DESCENDING), ("submitted_at", ASCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("department", ASCENDING), ("score", DESCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("status", ASCENDING)])
        database.contest_participants.create_index([("contest_id", ASCENDING), ("submitted", ASCENDING)])
        database.contest_participants.create_index([("user_id", ASCENDING), ("joined_at", DESCENDING)])
        
        # Contest assigned questions are also stored per attempt.
        try:
            database.contest_assigned_questions.drop_index("contest_id_1_user_id_1")
        except Exception:
            pass
        database.contest_assigned_questions.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING), ("attempt_number", ASCENDING)])
        database.contest_assigned_questions.create_index([("contest_id", ASCENDING), ("student_id", ASCENDING)])
        
        # Contest Submissions & Anti Cheat Logs
        database.contest_submissions.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING)])
        database.anti_cheat_logs.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING), ("timestamp", DESCENDING)])
        database.notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    except Exception as e:
        logger.warning(f"Index creation notice: {e}")

def get_db():
    global db
    if db is None:
        return init_db()
    return db
