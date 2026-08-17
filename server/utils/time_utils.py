from datetime import datetime, timezone
import zoneinfo

IST = zoneinfo.ZoneInfo("Asia/Kolkata")
UTC = timezone.utc

def get_utc_now():
    """Return the current time in timezone-aware UTC."""
    return datetime.now(UTC)

def get_ist_now():
    """Return the current time in Asia/Kolkata (IST)."""
    return datetime.now(IST)

def parse_to_utc_datetime(val):
    """
    Parse a datetime object or string into a timezone-aware UTC datetime.
    - If val is already a datetime:
        - If naive, assume UTC.
        - If aware, convert to UTC.
    - If val is a string:
        - If has timezone offset (+HH:MM or Z), parse and convert to UTC.
        - If naive (e.g., '2026-08-17T18:25' from datetime-local input in IST),
          assume it is Asia/Kolkata (IST) time and convert to UTC.
    """
    if not val:
        return None

    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=UTC)
        return val.astimezone(UTC)

    val_str = str(val).strip()
    if not val_str:
        return None

    # Handle standard ISO with Z
    if val_str.endswith("Z") or val_str.endswith("z"):
        try:
            dt = datetime.fromisoformat(val_str[:-1] + "+00:00")
            return dt.astimezone(UTC)
        except Exception:
            pass

    # Handle ISO with offset (+05:30 or -05:00)
    if "+" in val_str[10:] or ("-" in val_str[10:] and "T" in val_str):
        try:
            dt = datetime.fromisoformat(val_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt.astimezone(UTC)
        except Exception:
            pass

    # Otherwise it is a naive local datetime string (like '2026-08-17T18:25:00' from IST admin input)
    try:
        dt = datetime.fromisoformat(val_str)
        # Localize as Asia/Kolkata (IST) then convert to UTC
        dt_ist = dt.replace(tzinfo=IST)
        return dt_ist.astimezone(UTC)
    except Exception:
        pass

    # Fallback to general parsing
    try:
        from dateutil import parser
        parsed = parser.parse(val_str)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=IST)
        return parsed.astimezone(UTC)
    except Exception:
        return None

def format_utc_iso(dt):
    """Format a datetime to standard UTC ISO 8601 string with Z suffix."""
    if not dt:
        return None
    if isinstance(dt, str):
        dt = parse_to_utc_datetime(dt)
        if not dt:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    utc_dt = dt.astimezone(UTC)
    iso = utc_dt.isoformat()
    if iso.endswith("+00:00"):
        iso = iso[:-6] + "Z"
    return iso

def calculate_contest_status(start, end, now=None):
    """
    Calculate contest status dynamically:
      - Upcoming: now < start
      - Active: start <= now <= end
      - Past: now > end
    Returns string: 'Upcoming' | 'Active' | 'Past'
    """
    if now is None:
        now = get_utc_now()
    elif isinstance(now, datetime) and now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    start_utc = parse_to_utc_datetime(start)
    end_utc = parse_to_utc_datetime(end)

    if not start_utc or not end_utc:
        return "Upcoming"

    if now < start_utc:
        return "Upcoming"
    elif start_utc <= now <= end_utc:
        return "Active"
    else:
        return "Past"
