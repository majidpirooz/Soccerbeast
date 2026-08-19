import os
from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


API_KEY = os.getenv("API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./livescore.db")
TARGET_URL = os.getenv("TARGET_URL", "https://www.varzesh3.com/livescore")

DEFAULT_INTERVAL_SECONDS = int(os.getenv("DEFAULT_INTERVAL_SECONDS", "30"))
DEFAULT_RECHECK_SECONDS = int(os.getenv("DEFAULT_RECHECK_SECONDS", "30"))
MIN_INTERVAL_SECONDS = int(os.getenv("MIN_INTERVAL_SECONDS", "15"))

# How often (seconds) to check whether any match needs a lineup/stats detail-page
# visit (kickoff ~10 min away, just hit half-time, or just finished). Independent
# of the main livescore reload interval -- these visits are rare per match.
DETAIL_CHECK_INTERVAL_SECONDS = int(os.getenv("DETAIL_CHECK_INTERVAL_SECONDS", "60"))

# How many minutes before kickoff to fetch the lineup.
LINEUP_MINUTES_BEFORE_KICKOFF = int(os.getenv("LINEUP_MINUTES_BEFORE_KICKOFF", "10"))

SAVE_RAW_HTML = _bool("SAVE_RAW_HTML", False)
RAW_HTML_DIR = os.getenv("RAW_HTML_DIR", "./snapshots")

HEADLESS = _bool("HEADLESS", True)

if not API_KEY:
    raise RuntimeError(
        "API_KEY is not set. Copy .env.example to .env and set a real API_KEY "
        "before starting the service."
    )
