"""
Parses a "<Team>-team-statistic" page (either raw HTML string, works the
same whether it came from a saved file or a live fetch) into a list of
stat dicts ready to insert into `team_statistics`.
"""
from __future__ import annotations

import logging
from typing import Optional

from bs4 import BeautifulSoup

from parsers.stat_map import label_to_key
from persian_utils import to_number

log = logging.getLogger(__name__)

# Selectors are based on the current football360.ir markup. These are
# Next.js CSS-module hashed class names (e.g. "style_list__7NMAO") that
# WILL change whenever the site rebuilds its frontend. If parsing suddenly
# returns 0 stats, re-inspect a fresh saved page and update SELECTORS below.
SELECTORS = {
    "container": ".style_container__jJpQz",
    "stat_list": "ul.style_list__7NMAO",
    "list_item": "li",
}


def parse_statistics_page(html: str, source_url: Optional[str] = None) -> list[dict]:
    """
    Returns a list of dicts: [{stat_key, stat_label, stat_value, raw_value, source_url}, ...]
    Falls back to a page-wide search for label/value <li> pairs if the known
    container selector isn't found (best-effort resilience against minor
    markup changes).
    """
    soup = BeautifulSoup(html, "lxml")
    container = soup.select_one(SELECTORS["container"])
    lists = container.select(SELECTORS["stat_list"]) if container else soup.select(SELECTORS["stat_list"])

    if not lists:
        log.warning(
            "No stat lists found with selector %s (source=%s). "
            "The site's markup may have changed; see SELECTORS in parsers/statistics.py.",
            SELECTORS["stat_list"], source_url,
        )
        return []

    results = []
    for ul in lists:
        # Each <ul> holds one or more <li>, and each <li> holds exactly two
        # child <div>s: a Farsi label and its value, e.g.
        #   <li><div>گل زده</div><div>41</div></li>
        for li in ul.find_all(SELECTORS["list_item"], recursive=False):
            divs = li.find_all("div", recursive=False)
            if len(divs) != 2:
                log.debug(
                    "Skipping stat <li> with %d child divs (expected 2): %r",
                    len(divs), li.get_text(" ", strip=True),
                )
                continue
            label_text = divs[0].get_text(strip=True)
            value_text = divs[1].get_text(strip=True)
            stat_key = label_to_key(label_text)
            results.append({
                "stat_key": stat_key,
                "stat_label": label_text,
                "stat_value": to_number(value_text),
                "raw_value": value_text,
                "source_url": source_url,
            })
    return results
