"""
Turns parsed dicts (from parsers/statistics.py and parsers/matches.py) into
rows in the SQLite database.
"""
from __future__ import annotations

import sqlite3


def save_statistics(conn: sqlite3.Connection, team_id: int, stats: list[dict]) -> int:
    """Append a new snapshot of stats for this team. Returns rows written."""
    conn.executemany(
        """INSERT INTO team_statistics (team_id, stat_key, stat_label, stat_value, raw_value, source_url)
           VALUES (:team_id, :stat_key, :stat_label, :stat_value, :raw_value, :source_url)""",
        [{**s, "team_id": team_id} for s in stats],
    )
    conn.commit()
    return len(stats)


def save_matches(conn: sqlite3.Connection, team_id: int, matches: list[dict]) -> dict:
    """
    Upsert matches for this team (INSERT, or UPDATE on (team_id, match_uid)
    conflict since re-scraping the same page is expected as scores/kickoff
    times get updated). Returns {'written': N}.
    """
    sql = """
    INSERT INTO matches (
        team_id, match_uid, source_url, match_link, competition, date_raw,
        date_jalali_year, date_jalali_month, date_jalali_day, date_gregorian,
        status, home_team, away_team, home_score, away_score,
        kickoff_time_raw, kickoff_time
    ) VALUES (
        :team_id, :match_uid, :source_url, :match_link, :competition, :date_raw,
        :date_jalali_year, :date_jalali_month, :date_jalali_day, :date_gregorian,
        :status, :home_team, :away_team, :home_score, :away_score,
        :kickoff_time_raw, :kickoff_time
    )
    ON CONFLICT(team_id, match_uid) DO UPDATE SET
        source_url=excluded.source_url,
        match_link=excluded.match_link,
        competition=excluded.competition,
        date_raw=excluded.date_raw,
        date_jalali_year=excluded.date_jalali_year,
        date_jalali_month=excluded.date_jalali_month,
        date_jalali_day=excluded.date_jalali_day,
        date_gregorian=excluded.date_gregorian,
        status=excluded.status,
        home_team=excluded.home_team,
        away_team=excluded.away_team,
        home_score=excluded.home_score,
        away_score=excluded.away_score,
        kickoff_time_raw=excluded.kickoff_time_raw,
        kickoff_time=excluded.kickoff_time,
        scraped_at=datetime('now')
    """
    conn.executemany(sql, [{**m, "team_id": team_id} for m in matches])
    conn.commit()
    return {"written": len(matches)}


def log_scrape(conn: sqlite3.Connection, *, team_id, page_type, mode, source, status, detail=None):
    conn.execute(
        """INSERT INTO scrape_log (team_id, page_type, mode, source, status, detail)
           VALUES (?,?,?,?,?,?)""",
        (team_id, page_type, mode, source, status, detail),
    )
    conn.commit()
