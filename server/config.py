import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv(override=False)

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
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
    
    # CORS Configuration
    _cors_raw = os.getenv("CORS_ORIGINS", "")
    _frontend_url = os.getenv("FRONTEND_URL", "")
    _origins = [o.strip() for o in _cors_raw.split(",") if o.strip()] if _cors_raw else []
    if _frontend_url and _frontend_url not in _origins:
        _origins.append(_frontend_url.strip())
    CORS_ORIGINS = _origins if _origins else ["*"]
    
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 48))

    # Redis / Queue Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    # "auto" = use queue when Redis is up, sync otherwise
    # "queue" = always use queue (fail if Redis is down)
    # "sync"  = always execute synchronously (local dev default)
    EXECUTION_MODE = os.getenv("EXECUTION_MODE", "auto").lower()
