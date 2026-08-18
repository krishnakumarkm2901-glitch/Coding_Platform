"""
Quick script to create the admin user in MongoDB Atlas.
Usage:
    python create_admin.py "mongodb+srv://user:pass@cluster.mongodb.net/dbname"
"""
import sys
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pymongo import MongoClient
from utils.security import hash_password

# Accept URI from command line or env
mongo_uri = sys.argv[1] if len(sys.argv) > 1 else os.getenv("MONGO_URI")

if not mongo_uri:
    print("ERROR: Provide your MongoDB Atlas URI as an argument:")
    print('  python create_admin.py "mongodb+srv://user:pass@cluster.mongodb.net/dbname"')
    sys.exit(1)

print(f"Connecting to: {mongo_uri[:30]}...")

client = MongoClient(mongo_uri)
db = client.get_default_database()

# Upsert admin — creates if not exists, updates if exists
result = db.users.update_one(
    {"email": "nitplacements@nehrucolleges.com"},
    {"$set": {
        "name": "Platform Administrator",
        "email": "nitplacements@nehrucolleges.com",
        "username": "nitplacements",
        "password": hash_password("circa@1234"),
        "role": "ADMIN",
        "status": "active",
        "updated_at": datetime.now(timezone.utc),
    },
    "$setOnInsert": {
        "created_at": datetime.now(timezone.utc),
    }},
    upsert=True
)

if result.upserted_id:
    print("Admin user CREATED successfully!")
else:
    print("Admin user UPDATED successfully!")

print("Email:    nitplacements@nehrucolleges.com")
print("Password: circa@1234")
client.close()
