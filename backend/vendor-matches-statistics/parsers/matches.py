"""
Parses a "<Team>-Matches" page into a list of match dicts ready to insert
into the `matches` table. Handles both finished matches (score + "پایان"
status) and scheduled/future matches (kickoff time, no score yet) which
both appear in the same list on football360.ir.
"""
from __future__ import annotations

import logging
import re
from typing import Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from persian_utils import fix_bidi_time, parse_persian_date, to_number

log = logging.getLogger(__name__)

# See the module docstring in parsers/statistics.py re: these being
# Next.js hashed class names that can change on a site rebuild.
SELECTORS = {
    "match_list": ".style_matchList__Wvq0w li",
    "date": ".style_date__2lA7c",
    "competition": ".style_competition__oyHBO",
    "match_link": "a.style_MatchItem__9fzN3",
    "home_name": ".style_HomeTeam__Bi3Zc .style_title__VxtR3",
    "away_name": ".style_AwayTeam__HPFe1 .style_title__VxtR3",
    "result_box": ".style_match__Fiqcg",
    "result_status": ".style_date__t6_B6",
}

_SCORE_RE = re.compile(r"^\s*\d+\s*-\s*\d+\s*$")
_UUID_RE = re.compile(r"/matches/([0-9a-fA-F-]{36})/")


def _extract_match_uid(link: Optional[str]) -> Optional[str]:
    if not link:
        return None
    m = _UUID_RE.search(link)
    if m:
        return m.group(1)
    # Fallback: use the URL path itself as a stable-enough identifier.
    return urlparse(link).path or None


def parse_matches_page(html: str, source_url: Optional[str] = None) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    items = soup.select(SELECTORS["match_list"])

    if not items:
        log.warning(
            "No match items found with selector %s (source=%s). "
            "The site's markup may have changed; see SELECTORS in parsers/matches.py.",
            SELECTORS["match_list"], source_url,
        )
        return []

    results = []
    for li in items:
        date_el = li.select_one(SELECTORS["date"])
        comp_el = li.select_one(SELECTORS["competition"])
        link_el = li.select_one(SELECTORS["match_link"])
        home_el = li.select_one(SELECTORS["home_name"])
        away_el = li.select_one(SELECTORS["away_name"])
        result_el = li.select_one(SELECTORS["result_box"])
        status_el = li.select_one(SELECTORS["result_status"])

        if not (link_el and home_el and away_el):
            log.debug("Skipping malformed match <li>: %r", li.get_text(" ", strip=True)[:120])
            continue

        date_raw = date_el.get_text(strip=True) if date_el else None
        date_info = parse_persian_date(date_raw) if date_raw else None

        result_text = result_el.get_text(strip=True) if result_el else None
        is_finished = status_el is not None and status_el.get_text(strip=True) != ""

        home_score = away_score = None
        kickoff_raw = kickoff_time = None

        if is_finished and result_text and _SCORE_RE.match(result_text):
            home_score_s, away_score_s = [p.strip() for p in result_text.split("-")]
            home_score, away_score = to_number(home_score_s), to_number(away_score_s)
            status = "finished"
        elif result_text:
            kickoff_raw = result_text
            kickoff_time = fix_bidi_time(result_text)
            status = "scheduled"
        else:
            status = "unknown"

        match_link = link_el.get("href")

        row = {
            "match_uid": _extract_match_uid(match_link),
            "source_url": source_url,
            "match_link": match_link,
            "competition": comp_el.get_text(strip=True) if comp_el else None,
            "date_raw": date_raw,
            "date_jalali_year": date_info["jalali"][0] if date_info else None,
            "date_jalali_month": date_info["jalali"][1] if date_info else None,
            "date_jalali_day": date_info["jalali"][2] if date_info else None,
            "date_gregorian": date_info["gregorian"].isoformat() if date_info and date_info["gregorian"] else None,
            "status": status,
            "home_team": home_el.get_text(strip=True),
            "away_team": away_el.get_text(strip=True),
            "home_score": home_score,
            "away_score": away_score,
            "kickoff_time_raw": kickoff_raw,
            "kickoff_time": kickoff_time,
        }
        results.append(row)
    return results
