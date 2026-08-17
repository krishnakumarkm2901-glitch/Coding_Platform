from models.db import get_db
import zoneinfo
from datetime import datetime, timezone, timedelta

def migrate_contest_times():
    IST = zoneinfo.ZoneInfo("Asia/Kolkata")
    db = get_db()
    contests = list(db.contests.find({}))
    print(f"Total contests found: {len(contests)}")
    for c in contests:
        st = c.get("start_time")
        et = c.get("end_time")
        # If naive datetime, it was entered in IST and stored naively
        if isinstance(st, datetime) and st.tzinfo is None:
            st_utc = st.replace(tzinfo=IST).astimezone(timezone.utc)
            et_utc = et.replace(tzinfo=IST).astimezone(timezone.utc) if isinstance(et, datetime) else (st_utc + timedelta(minutes=c.get("duration_minutes", 60)))
            db.contests.update_one(
                {"_id": c["_id"]},
                {"$set": {"start_time": st_utc, "end_time": et_utc}}
            )
            print(f"Migrated contest '{c.get('title')}' (_id: {c['_id']}):")
            print(f"  Old: start={st}, end={et}")
            print(f"  New (UTC): start={st_utc}, end={et_utc}")
            print(f"  New (IST): start={st_utc.astimezone(IST)}, end={et_utc.astimezone(IST)}")

if __name__ == "__main__":
    migrate_contest_times()
