#!/usr/bin/env python3
"""
Football data scraper / DB populator for football360.ir team pages.

Usage examples:

  # 1. Create the SQLite database and tables
  python3 cli.py init-db

  # 2. Import team names + page links from the Excel workbook
  python3 cli.py import-teams --xlsx Teams-Links.xlsx

  # 3a. OFFLINE mode: parse saved HTML files from a folder
  python3 cli.py scrape --mode offline --dir ./saved_pages

  # 3b. ONLINE mode: fetch pages live
  python3 cli.py scrape --mode online

  # Scrape just one team, or just one page type
  python3 cli.py scrape --mode offline --dir ./saved_pages --team "Crystal Palace"
  python3 cli.py scrape --mode online --type statistics

  python3 cli.py list-teams
  python3 cli.py latest-stats --team "Crystal Palace"
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import db
from parsers.matches import parse_matches_page
from parsers.statistics import parse_statistics_page
from persistence import log_scrape, save_matches, save_statistics
from sources.excel_loader import load_teams_from_excel
from sources.offline_loader import match_team_files, scan_offline_directory
from sources.online_loader import fetch

DEFAULT_DB_PATH = "football.db"

log = logging.getLogger("football_scraper")


def _get_teams(conn, team_filter: str | None):
    if team_filter:
        rows = conn.execute("SELECT * FROM teams WHERE name = ?", (team_filter,)).fetchall()
        if not rows:
            log.error("No team found named %r. Run 'list-teams' to see options.", team_filter)
    else:
        rows = conn.execute("SELECT * FROM teams ORDER BY country, row_order").fetchall()
    return [dict(r) for r in rows]


def cmd_init_db(args):
    db.init_db(args.db)
    print(f"Initialized database at {args.db}")


def cmd_import_teams(args):
    conn = db.connect(args.db)
    try:
        summary = load_teams_from_excel(conn, args.xlsx)
        print(f"Inserted {summary['inserted']} team(s), updated {summary['updated']} team(s).")
        if summary["skipped_sheets"]:
            print(f"Skipped sheets (no usable header row): {summary['skipped_sheets']}")
    finally:
        conn.close()


def _process_page(conn, team, page_type, html, source):
    if html is None:
        log_scrape(conn, team_id=team["id"], page_type=page_type, mode=source["mode"],
                   source=source["location"], status="error", detail="fetch/read failed")
        return 0

    if page_type == "statistics":
        parsed = parse_statistics_page(html, source_url=source["location"])
        n = save_statistics(conn, team["id"], parsed)
    else:
        parsed = parse_matches_page(html, source_url=source["location"])
        n = save_matches(conn, team["id"], parsed)["written"]

    status = "ok" if n > 0 else "error"
    detail = f"{n} row(s) parsed" if n > 0 else "0 rows parsed - selectors may be stale"
    log_scrape(conn, team_id=team["id"], page_type=page_type, mode=source["mode"],
               source=source["location"], status=status, detail=detail)
    return n


def cmd_scrape(args):
    conn = db.connect(args.db)
    try:
        teams = _get_teams(conn, args.team)
        if not teams:
            return

        want_matches = args.type in ("both", "matches")
        want_stats = args.type in ("both", "statistics")

        offline_files = scan_offline_directory(args.dir) if args.mode == "offline" else None
        if args.mode == "offline" and not offline_files:
            log.warning("No usable *-Matches.html / *-team-statistic.html files found in %s", args.dir)

        total_teams, total_rows = 0, 0
        for team in teams:
            touched = False

            if want_matches and team.get("matches_url"):
                if args.mode == "offline":
                    match = match_team_files(team, offline_files)
                    path = match["matches"]
                    if path:
                        html = path.read_text(encoding="utf-8")
                        n = _process_page(conn, team, "matches", html,
                                           {"mode": "offline", "location": str(path)})
                        total_rows += n
                        touched = True
                    else:
                        log.warning("No offline file matched for %s (matches)", team["name"])
                else:
                    html = fetch(team["matches_url"])
                    n = _process_page(conn, team, "matches", html,
                                       {"mode": "online", "location": team["matches_url"]})
                    total_rows += n
                    touched = True

            if want_stats and team.get("statistics_url"):
                if args.mode == "offline":
                    match = match_team_files(team, offline_files)
                    path = match["statistics"]
                    if path:
                        html = path.read_text(encoding="utf-8")
                        n = _process_page(conn, team, "statistics", html,
                                           {"mode": "offline", "location": str(path)})
                        total_rows += n
                        touched = True
                    else:
                        log.warning("No offline file matched for %s (statistics)", team["name"])
                else:
                    html = fetch(team["statistics_url"])
                    n = _process_page(conn, team, "statistics", html,
                                       {"mode": "online", "location": team["statistics_url"]})
                    total_rows += n
                    touched = True

            if touched:
                total_teams += 1

        print(f"Scraped {total_teams} team(s), wrote {total_rows} row(s) total.")
    finally:
        conn.close()


def cmd_list_teams(args):
    conn = db.connect(args.db)
    try:
        rows = conn.execute(
            "SELECT country, name, persian_name, matches_url IS NOT NULL AS has_m, "
            "statistics_url IS NOT NULL AS has_s FROM teams ORDER BY country, row_order"
        ).fetchall()
        if not rows:
            print("No teams yet - run 'import-teams' first.")
            return
        for r in rows:
            flags = ("M" if r["has_m"] else "-") + ("S" if r["has_s"] else "-")
            print(f"[{flags}] {r['country']:<10} {r['name']:<30} {r['persian_name'] or ''}")
    finally:
        conn.close()


def cmd_latest_stats(args):
    conn = db.connect(args.db)
    try:
        team = conn.execute("SELECT id, name FROM teams WHERE name = ?", (args.team,)).fetchone()
        if not team:
            print(f"No team named {args.team!r}")
            return
        rows = conn.execute(
            """SELECT stat_key, stat_value, stat_label, scraped_at FROM team_statistics
               WHERE team_id = ? AND scraped_at = (
                   SELECT MAX(scraped_at) FROM team_statistics WHERE team_id = ?
               ) ORDER BY id""",
            (team["id"], team["id"]),
        ).fetchall()
        if not rows:
            print(f"No statistics stored yet for {args.team}.")
            return
        print(f"Latest statistics for {team['name']} (as of {rows[0]['scraped_at']}):")
        for r in rows:
            print(f"  {r['stat_key']:<32} {r['stat_value']}   ({r['stat_label']})")
    finally:
        conn.close()


def build_parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--db", default=DEFAULT_DB_PATH, help=f"Path to the SQLite file (default: {DEFAULT_DB_PATH})")
    p.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("init-db", help="Create the database and tables").set_defaults(func=cmd_init_db)

    imp = sub.add_parser("import-teams", help="Load teams + links from an Excel workbook")
    imp.add_argument("--xlsx", required=True, help="Path to Teams-Links.xlsx")
    imp.set_defaults(func=cmd_import_teams)

    scr = sub.add_parser("scrape", help="Parse team pages and populate the database")
    scr.add_argument("--mode", choices=["online", "offline"], required=True)
    scr.add_argument("--dir", help="Directory of saved .html files (required for --mode offline)")
    scr.add_argument("--team", help="Only scrape this one team (exact name match, e.g. 'Crystal Palace')")
    scr.add_argument("--type", choices=["both", "matches", "statistics"], default="both")
    scr.set_defaults(func=cmd_scrape)

    lt = sub.add_parser("list-teams", help="List teams currently in the database")
    lt.set_defaults(func=cmd_list_teams)

    ls = sub.add_parser("latest-stats", help="Print the most recent statistics snapshot for a team")
    ls.add_argument("--team", required=True)
    ls.set_defaults(func=cmd_latest_stats)

    return p


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    if args.command == "scrape" and args.mode == "offline" and not args.dir:
        parser.error("--dir is required when --mode offline")

    args.func(args)


if __name__ == "__main__":
    sys.exit(main())
