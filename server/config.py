import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("JWT_SECRET", "college_coding_super_secret_jwt_key_2026")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/college_coding_db")
    PISTON_API_URL = os.getenv("PISTON_API_URL", "https://emkc.org/api/v2/piston")
    GCC_PATH = os.getenv("GCC_PATH", "")
    GPP_PATH = os.getenv("GPP_PATH", "")
    JAVAC_PATH = os.getenv("JAVAC_PATH", "")
    JAVA_PATH = os.getenv("JAVA_PATH", "")
    GO_PATH = os.getenv("GO_PATH", "")
    RUSTC_PATH = os.getenv("RUSTC_PATH", "")
    NODE_PATH = os.getenv("NODE_PATH", "")
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 48))
