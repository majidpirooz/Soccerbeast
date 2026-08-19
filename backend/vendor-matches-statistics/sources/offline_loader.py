"""
Offline mode: instead of fetching football360.ir live, read HTML that was
already saved to disk (e.g. via "Save Page As" in a browser) and match each
file to the right team + page type.

Matching is fuzzy on purpose because real-world saved filenames vary:
  - "Crystal-Palace-team-statistic.html"       (hyphens, matches the URL slug)
  - "Borussia_Moenchengladbach-Matches.html"   (underscores instead of hyphens)
Both are normalized down to a bare alnum slug and compared against the same
normalization of the team name and of the slug embedded in matches_url /
statistics_url, so either naming style matches.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from persian_utils import slugify

log = logging.getLogger(__name__)

_MATCHES_SUFFIX = re.compile(r"[-_]matches$", re.IGNORECASE)
_STATS_SUFFIX = re.compile(r"[-_]team[-_]statistic$", re.IGNORECASE)


@dataclass
class OfflineFile:
    path: Path
    page_type: str  # 'matches' or 'statistics'
    slug: str       # normalized slug derived from the filename


def _classify_and_slug(filename_stem: str) -> Optional[tuple[str, str]]:
    if _MATCHES_SUFFIX.search(filename_stem):
        return "matches", slugify(_MATCHES_SUFFIX.sub("", filename_stem))
    if _STATS_SUFFIX.search(filename_stem):
        return "statistics", slugify(_STATS_SUFFIX.sub("", filename_stem))
    return None


def scan_offline_directory(directory: str | Path) -> list[OfflineFile]:
    """Find every *-Matches.html / *-team-statistic.html file in a directory."""
    directory = Path(directory)
    found = []
    for path in directory.glob("*.html"):
        classified = _classify_and_slug(path.stem)
        if not classified:
            log.debug("Ignoring file that doesn't look like a team page: %s", path.name)
            continue
        page_type, slug = classified
        found.append(OfflineFile(path=path, page_type=page_type, slug=slug))
    return found


def url_slug(url: Optional[str]) -> str:
    """Pull the team slug out of a football360.ir team URL and normalize it."""
    if not url:
        return ""
    path_parts = [p for p in urlparse(url).path.split("/") if p]
    # .../team/<slug> or .../team/<slug>/team-statistic
    if "team" in path_parts:
        idx = path_parts.index("team")
        if idx + 1 < len(path_parts):
            return slugify(path_parts[idx + 1])
    return ""


def match_team_files(team: dict, offline_files: list[OfflineFile]) -> dict:
    """
    Given a team row (dict with at least 'name', 'matches_url', 'statistics_url')
    and the list of files found on disk, return {'matches': Path|None, 'statistics': Path|None}.
    """
    name_slug = slugify(team["name"])
    matches_slug = url_slug(team.get("matches_url"))
    stats_slug = url_slug(team.get("statistics_url"))

    result = {"matches": None, "statistics": None}
    for f in offline_files:
        if f.page_type == "matches" and f.slug in (name_slug, matches_slug):
            result["matches"] = f.path
        elif f.page_type == "statistics" and f.slug in (name_slug, stats_slug):
            result["statistics"] = f.path
    return result
