"""
Online mode: fetch a team's Matches / Statistics pages live over HTTP.

Kept deliberately simple (requests + a polite delay) since football360.ir
is server-rendered HTML (no JS execution needed - the sample pages already
contain the full data in the initial HTML). If that ever stops being true,
swap `fetch` below for a headless-browser fetch (e.g. Playwright) without
touching any of the parsers.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

import requests

log = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "fa,en;q=0.8",
}


def fetch(url: str, *, timeout: int = 20, retries: int = 2, delay_seconds: float = 1.5) -> Optional[str]:
    """Fetch a URL and return its HTML text, or None after exhausting retries."""
    last_error = None
    for attempt in range(1, retries + 2):
        try:
            resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as exc:
            last_error = exc
            log.warning("Fetch attempt %d/%d failed for %s: %s", attempt, retries + 1, url, exc)
            if attempt <= retries:
                time.sleep(delay_seconds * attempt)
    log.error("Giving up on %s after %d attempts: %s", url, retries + 1, last_error)
    return None
