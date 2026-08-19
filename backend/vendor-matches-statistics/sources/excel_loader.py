"""
Loads teams from the "Teams-Links.xlsx" workbook (one sheet per
country/league, columns: Row, Team Name, Matches, Statistics, Persian Name)
into the `teams` table. Safe to re-run: existing teams are updated in place
(matched on name + country) rather than duplicated.
"""
from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

import openpyxl

log = logging.getLogger(__name__)

# Column order is what we rely on, not the exact header text - different
# sheets in the same workbook have been seen using different labels for the
# same columns (e.g. "Matches" vs "Link to matches").
EXPECTED_COLUMN_COUNT = 5


def load_teams_from_excel(conn: sqlite3.Connection, xlsx_path: str | Path) -> dict:
    """
    Returns a summary dict: {"inserted": N, "updated": N, "skipped_sheets": [...]}
    """
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    inserted = updated = 0
    skipped_sheets = []

    for sheet in wb.worksheets:
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            skipped_sheets.append(sheet.title)
            continue
        header = [str(h).strip() if h else "" for h in rows[0]]
        if len(header) < EXPECTED_COLUMN_COUNT or not header[0] or not header[1]:
            log.warning(
                "Sheet %r doesn't look like a team-links sheet (header row: %r) - skipping.",
                sheet.title, header,
            )
            skipped_sheets.append(sheet.title)
            continue
        log.debug("Sheet %r header columns: %r", sheet.title, header[:EXPECTED_COLUMN_COUNT])

        country = sheet.title
        for row in rows[1:]:
            if not row or not row[1]:  # no Team Name
                continue
            row_order, name, matches_url, statistics_url, persian_name = (row + (None,) * 5)[:5]
            name = str(name).strip()

            cur = conn.execute(
                "SELECT id FROM teams WHERE name = ? AND country = ?", (name, country)
            )
            existing = cur.fetchone()
            if existing:
                conn.execute(
                    """UPDATE teams SET row_order=?, matches_url=?, statistics_url=?,
                       persian_name=?, updated_at=datetime('now') WHERE id=?""",
                    (row_order, matches_url, statistics_url, persian_name, existing["id"]),
                )
                updated += 1
            else:
                conn.execute(
                    """INSERT INTO teams (name, persian_name, country, row_order,
                       matches_url, statistics_url) VALUES (?,?,?,?,?,?)""",
                    (name, persian_name, country, row_order, matches_url, statistics_url),
                )
                inserted += 1

    conn.commit()
    return {"inserted": inserted, "updated": updated, "skipped_sheets": skipped_sheets}
