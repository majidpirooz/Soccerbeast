"""
Helpers for dealing with Persian (Farsi) text that football360.ir pages are
written in: Eastern Arabic-Indic digits, Persian calendar dates, and
right-to-left number quirks.
"""
from __future__ import annotations

import re
from typing import Optional

_FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
_AR_DIGITS = "٠١٢٣٤٥٦٧٨٩"
_DIGIT_MAP = {d: str(i) for i, d in enumerate(_FA_DIGITS)}
_DIGIT_MAP.update({d: str(i) for i, d in enumerate(_AR_DIGITS)})

PERSIAN_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]


def fa_to_en_digits(text: str) -> str:
    """Convert Persian/Arabic-Indic digits in a string to plain ASCII digits."""
    if text is None:
        return text
    return "".join(_DIGIT_MAP.get(ch, ch) for ch in text)


def to_number(text: str):
    """Parse a Farsi-formatted number ('۱۱.۶۳', '۴۵۱') into int/float, else None."""
    if text is None:
        return None
    cleaned = fa_to_en_digits(text).strip()
    cleaned = cleaned.replace(",", "")
    if cleaned in ("", "-", "—", "N/A"):
        return None
    try:
        if "." in cleaned:
            return float(cleaned)
        return int(cleaned)
    except ValueError:
        return None


def parse_persian_date(text: str) -> Optional[dict]:
    """
    Parse a Persian-calendar date string like '۰۶ اردیبهشت ۱۴۰۴' into a dict:
    {'jalali': (1404, 2, 6), 'gregorian': date(2025, 4, 26) or None, 'raw': text}
    Returns None if it cannot be parsed.
    """
    if not text:
        return None
    raw = text.strip()
    normalized = fa_to_en_digits(raw)
    m = re.match(r"(\d{1,2})\s+([^\d\s]+)\s+(\d{4})", normalized)
    if not m:
        return None
    day, month_name, year = m.groups()
    month_name = month_name.strip()
    try:
        month = PERSIAN_MONTHS.index(month_name) + 1
    except ValueError:
        return None
    day, year = int(day), int(year)

    gregorian = None
    try:
        import jdatetime  # optional dependency, see requirements.txt
        gregorian = jdatetime.date(year, month, day).togregorian()
    except Exception:
        gregorian = None

    return {
        "jalali": (year, month, day),
        "gregorian": gregorian,
        "raw": raw,
    }


def fix_bidi_time(text: str) -> Optional[str]:
    """
    football360.ir renders upcoming-match kickoff times inside an RTL context
    without a bidi isolate, which causes the two HH/MM halves to be swapped in
    the raw HTML source (e.g. source '30 : 15' displays as '15:30' in a
    browser). This undoes that swap and returns a normalized 'HH:MM' string.

    NOTE: this is a best-effort heuristic reverse-engineered from sample
    pages, not something documented by the site. Spot-check a few results
    against the live site after deployment; see README.
    """
    if not text:
        return None
    normalized = fa_to_en_digits(text)
    parts = [p.strip() for p in normalized.split(":")]
    if len(parts) != 2 or not all(p.isdigit() for p in parts):
        return None
    minute, hour = parts  # swapped order in source
    return f"{int(hour):02d}:{int(minute):02d}"


def slugify(text: str) -> str:
    """Normalize a team name / filename fragment for fuzzy matching."""
    if text is None:
        return ""
    text = fa_to_en_digits(text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text
