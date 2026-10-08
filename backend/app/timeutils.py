from datetime import datetime, timezone

def utc_now() -> datetime:
    """
    Current UTC time as a naive datetime.

    Timestamps are stored naive-in-UTC because SQLite drops timezone info;
    keeping every comparison naive avoids mixing aware and naive values.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
