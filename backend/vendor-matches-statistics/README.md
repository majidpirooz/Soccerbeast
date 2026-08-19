# Football Data Scraper / DB Populator

Populates a SQLite database from football360.ir team pages: a **Matches**
page (played + upcoming fixtures) and a **team-statistic** page (season
averages), for every team listed in a `Teams-Links.xlsx` workbook. Works in
two modes:

- **offline** — parses HTML files you've already saved to disk
- **online** — fetches the pages live over HTTP

Both modes share the exact same parsing code, so results are identical
either way.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Quick start

```bash
# 1. Create the database (default file: football.db)
python3 cli.py init-db

# 2. Import teams + their page links from the Excel workbook
python3 cli.py import-teams --xlsx Teams-Links.xlsx

# 3a. Offline: point at a folder of saved *.html files
python3 cli.py scrape --mode offline --dir ./saved_pages

# 3b. Online: fetch every team's pages live
python3 cli.py scrape --mode online

# Check what's in the database
python3 cli.py list-teams
python3 cli.py latest-stats --team "Crystal Palace"
```

Useful flags on `scrape`:
- `--team "Crystal Palace"` — only scrape one team (exact name match)
- `--type matches` / `--type statistics` — only scrape one page type
- global `-v` (before the subcommand) — verbose/debug logging, e.g.
  `python3 cli.py -v scrape --mode online`

Re-running `scrape` is safe: match rows are upserted (matched on team +
match UID) so scores/kickoff-times update in place without duplicating
rows. Statistics are stored as a new timestamped snapshot each run (see
"Schema" below) so you can track how season averages evolve over time.

## How offline mode finds the right file

Saved filenames aren't required to follow one exact convention. A file is
recognized as a team page if its name ends in `-Matches` or
`-team-statistic` (hyphen or underscore), e.g.:

- `Crystal-Palace-team-statistic.html`
- `Borussia_Moenchengladbach-Matches.html`

It's then matched to a team by normalizing both the filename and the
team's name/URL slug down to a bare lowercase alnum string, so
`Borussia_Moenchengladbach` matches team name `Borussia Moenchengladbach`
regardless of spacing/casing/hyphenation. If a team's file isn't found, you
get a warning naming the team — no partial/incorrect data is written.

## Excel workbook expectations

One sheet per country/league. Columns are matched **positionally** (not by
exact header text, since real sheets have used both `Matches` and `Link to
matches` as a header): `Row, Team Name, <matches link>, <statistics link>,
Persian Name`. Re-running `import-teams` updates existing teams (matched on
name + country) instead of creating duplicates.

## Database schema (`db.py`)

- **teams** — one row per team: name, Persian name, country/league, and
  the two source links (`matches_url`, `statistics_url`).
- **team_statistics** — EAV-style (`stat_key`, `stat_value`) rather than
  fixed columns, stamped with `scraped_at`. This means a new stat the site
  adds later shows up automatically (see "Extending" below) without a
  schema migration, and you keep full history for trend charts. To read
  just the latest snapshot per team, filter on
  `scraped_at = (SELECT MAX(scraped_at) ...)` — see `latest-stats` in
  `cli.py` for a working example query.
- **matches** — one row per fixture, `status` is `finished` / `scheduled`.
  Finished matches have `home_score`/`away_score`; scheduled ones have
  `kickoff_time` instead. Dates are stored both as the original Persian
  calendar string and as a converted Gregorian ISO date
  (`date_gregorian`), so your website can sort/filter without doing
  calendar math itself.
- **scrape_log** — one row per page scraped (online or offline), so you
  can see when a team was last scraped and whether it succeeded — handy
  for a cron job to alert on repeated failures.

## Known caveats — please read

1. **CSS selectors will break eventually.** football360.ir is a Next.js
   site with hashed class names (`style_list__7NMAO` etc.) that change
   whenever the site is rebuilt/redeployed. The two parsers
   (`parsers/statistics.py`, `parsers/matches.py`) list their selectors at
   the top of the file with a comment flagging this. If a scrape suddenly
   returns 0 rows, that's the first thing to check — save a fresh page,
   inspect it, and update the selector there.

2. **Kickoff time is a best-effort reversal, not a documented format.**
   For upcoming matches, the raw HTML has the hour/minute swapped (e.g.
   source `"30 : 15"` for what displays as `15:30` in a browser) — this
   looks like a workaround the site uses for an RTL rendering quirk. The
   code un-swaps it (see `persian_utils.fix_bidi_time`), but this was
   reverse-engineered from a handful of sample rows. Spot-check a few
   scraped `kickoff_time` values against the live site after your first
   real run.

3. **Only two sample pages were available while building this**
   (Crystal Palace statistics, Borussia Mönchengladbach matches). The
   parsers were built and tested against exactly those, so they're solid
   for that markup — but a page for a different competition/season (cup
   competitions, a team with no matches yet, etc.) could have small
   layout differences not covered here. Run a small offline batch first
   and check `list-teams` / a few `latest-stats` calls before trusting a
   full online run against 50+ teams.

4. **Be polite in online mode.** `sources/online_loader.py` fetches
   sequentially with retry backoff but no built-in delay between
   different teams. If you're scraping 50+ teams regularly, consider
   adding `time.sleep(...)` between teams in `cmd_scrape` (`cli.py`) so
   you're not hammering the site, and set a proper contact email in the
   User-Agent if you want to be extra courteous.

## Extending

- **New/renamed stat labels**: add the Farsi label → English key mapping
  in `parsers/stat_map.py`. Anything not in that dict still gets stored
  (with an `unmapped_...` key, generated from the Farsi text) and logs a
  warning — so nothing is silently dropped, you just get to name it later.
- **Different site / different markup entirely**: only
  `parsers/statistics.py` and `parsers/matches.py` know about HTML
  structure. Everything else (DB, CLI, Excel import, online/offline
  fetching) is site-agnostic.
- **Scheduling**: this is a plain CLI script, so a cron entry like
  `0 3 * * * cd /path/to/football_db && venv/bin/python cli.py scrape --mode online`
  is enough to keep the database current; no daemon needed.
