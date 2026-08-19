"""
SQLite schema + connection helper for the football database.

Design notes:
- `teams` holds one row per team, including the source links for its two
  page types (matches_url, statistics_url) plus the Persian name and the
  league/country the team belongs to (from the Excel sheet name).
- `team_statistics` is stored as EAV (team_id, stat_key, value) rather than
  fixed columns. The site's stat list can change over time; EAV lets new
  stats show up without a migration. Each scrape's rows are stamped with
  `scraped_at`; the app can always read "latest per stat_key" or keep full
  history for trend charts.
- `matches` has one row per match as seen from a given team's matches page.
  A UNIQUE constraint on `source_url` (or `match_uid` when derivable)
  prevents duplicate rows on re-scrape; re-scraping upserts instead.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS teams (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,          -- English name, e.g. 'Crystal Palace'
    persian_name    TEXT,                   -- e.g. 'کریستال پالاس'
    country         TEXT,                   -- Excel sheet name, e.g. 'England'
    row_order       INTEGER,                -- original row # in the Excel sheet
    matches_url     TEXT,                   -- link to the "-Matches" page
    statistics_url  TEXT,                   -- link to the "-team-statistic" page
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(name, country)
);

CREATE TABLE IF NOT EXISTS team_statistics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    stat_key    TEXT NOT NULL,              -- stable English key, see stat_map.py
    stat_label  TEXT,                       -- original Farsi label, kept for reference
    stat_value  REAL,                       -- numeric value (NULL if unparsable)
    raw_value   TEXT,                       -- original text, for anything non-numeric
    source_url  TEXT,
    scraped_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_team_statistics_team ON team_statistics(team_id);
CREATE INDEX IF NOT EXISTS idx_team_statistics_lookup ON team_statistics(team_id, stat_key, scraped_at);

CREATE TABLE IF NOT EXISTS matches (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id             INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    match_uid           TEXT,               -- id parsed out of the match link, if present
    source_url          TEXT NOT NULL,      -- the matches-page URL this row came from
    match_link          TEXT,               -- link to the match's own detail page
    competition         TEXT,
    date_raw            TEXT,               -- Persian-calendar date, as shown on the page
    date_jalali_year    INTEGER,
    date_jalali_month   INTEGER,
    date_jalali_day     INTEGER,
    date_gregorian      TEXT,               -- ISO date, when convertible
    status              TEXT NOT NULL CHECK (status IN ('finished','scheduled','unknown')),
    home_team           TEXT,
    away_team           TEXT,
    home_score          INTEGER,
    away_score          INTEGER,
    kickoff_time_raw    TEXT,               -- as-scraped, unswapped
    kickoff_time        TEXT,               -- best-effort 'HH:MM', see persian_utils.fix_bidi_time
    scraped_at          TEXT DEFAULT (datetime('now')),
    UNIQUE(team_id, match_uid)
);
CREATE INDEX IF NOT EXISTS idx_matches_team ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date_gregorian);

CREATE TABLE IF NOT EXISTS scrape_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    page_type   TEXT NOT NULL CHECK (page_type IN ('matches','statistics')),
    mode        TEXT NOT NULL CHECK (mode IN ('online','offline')),
    source      TEXT,                       -- URL or file path used
    status      TEXT NOT NULL CHECK (status IN ('ok','error')),
    detail      TEXT,                       -- error message, or short summary
    scraped_at  TEXT DEFAULT (datetime('now'))
);
"""


def connect(db_path: str | Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str | Path) -> None:
    conn = connect(db_path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
