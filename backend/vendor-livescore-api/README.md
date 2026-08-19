# Live Score API

Scrapes `https://www.varzesh3.com/livescore` through a real (headless) browser on a
configurable interval, expands every football match's dropdown so goal scorers,
cards and substitutions are captured, and stores structured data in a local
database. Your website talks to this service over a small authenticated REST API
— it never scrapes the site directly.

## How it works

- One long-lived Playwright/Chromium browser context reloads the same tab every
  `interval_seconds` (default 30s, adjustable live via the API). Re-using one
  browser/session rather than spawning new ones per request is the main thing
  keeping this from looking like scraping traffic.
- Each cycle: load the page → click every closed dropdown for football matches →
  wait for their content → read the DOM into structured records → save to DB.
- Team names, score, kickoff time and status are always available (they're in
  the closed row). Goal scorers, assists, cards and substitutions only appear
  once a match's dropdown has been opened, which is why every cycle re-opens
  any dropdown that isn't already open (covers new matches appearing, or the UI
  resetting).
- Extraction is keyed off stable signals — the `/football/match/{id}/` URL
  pattern, and icon `alt`/`src` attributes (`goal.svg`, `subtitute.svg`,
  `yellow-card.svg`, `angle-down-accent.svg`) — rather than the site's hashed
  CSS class names, which change on every deploy and would break a class-based
  scraper silently.
- Events are de-duplicated (same match + minute + type + player is only stored
  once), so re-scanning already-open dropdowns every cycle doesn't create
  duplicate rows.

**Verified against real markup**: goals, own goals, penalty goals, assists,
substitutions, yellow cards, and red cards all match confirmed examples from
your sample files. There's no distinct "second yellow" icon on the site at all
— a second yellow just shows up as a second ordinary `yellow_card` event for
the same player, so `event_type` never contains a `second_yellow_card` value;
infer it client-side by grouping `yellow_card` events per `(match_id,
player_name)`.

## Lineups, formations, coaches, and match statistics

Beyond the livescore list, the API also visits each match's own detail page
(`/football/match/{id}/{slug}`) to capture:

- **Starting lineup + substitutes bench** (jersey number + name, per team)
- **Formation** (e.g. `4-3-2-1`) per team
- **Head coach** per team
- **Match statistics** (possession, shots, cards, etc.) — captured **twice**:
  once at half-time, once at full-time, per your request

This runs as a **separate, independent loop** from the main 30-second
livescore cycle (its own tab in the same browser session, so it never slows
down or blocks the regular cycle). It checks every
`DETAIL_CHECK_INTERVAL_SECONDS` (default 60s) for matches that need a visit:

- **Lineup**: fetched once, ~`LINEUP_MINUTES_BEFORE_KICKOFF` (default 10)
  minutes before kickoff. Kickoff time is inferred by combining the displayed
  time (e.g. `23:15`) with today's date in Tehran time — the livescore page
  doesn't expose a full date, so this is a best-effort assumption. If a match
  hasn't published its lineup by kickoff yet, the loop just keeps retrying
  every pass until it appears (it never gives up permanently).
- **Half-time stats**: fetched once, the first time a match's status text
  contains "نیمه" (half) — confirmed against a real half-time example
  (`پایان نیمه`). Fixing this also caught a real bug: the extractor was
  previously hardcoding `status_text` to the literal string `"live"` whenever
  the live badge was showing, instead of the actual displayed text — which
  meant half-time would never have been detected even though the filter logic
  itself was correct. Now `status_text` reflects real in-between states like
  `پایان نیمه`, and `minute_text` is only set while a real running minute
  (e.g. `61'`) is shown next to the live badge.
- **Full-time stats**: fetched once, when status text is exactly `نتیجه نهایی`
  (confirmed).

**Each of these is fetched at most once per match, ever** — not on every
cycle — since lineups and phase-stats don't change once set. This keeps the
extra load from this feature small regardless of how many matches are live.

**Missing data is normal, not an error.** Lower-profile matches/leagues may
never publish a lineup or statistics at all. In that case the corresponding
`*_fetched_at` timestamp simply stays `null` forever (after some retries), and
`/matches/{id}` returns empty lists / null fields for that section rather than
an error — your website's frontend should treat an empty lineup/stats block as
"not available for this match", not a failure.

**Configuration** (in `.env`):
```
DETAIL_CHECK_INTERVAL_SECONDS=60
LINEUP_MINUTES_BEFORE_KICKOFF=10
```

**Response shape** — `GET /matches/{match_id}` now additionally includes:
```json
{
  "lineup": {
    "fetched_at": "2026-07-24T18:20:00",
    "host_formation": "4-3-2-1",
    "away_formation": "4-3-3",
    "host_coach": "استانکوویچ",
    "away_coach": "Haveron G.",
    "host_starters": [{"jersey_number": 1, "player_name": "ماتئوس"}, ...],
    "away_starters": [...],
    "host_bench": [...],
    "away_bench": [...]
  },
  "statistics": {
    "halftime": [{"stat_label": "مالکیت توپ", "home_value": "58", "away_value": "42"}, ...],
    "fulltime": [...]
  }
}
```
(`lineup` fields and both `statistics` lists will be `null`/empty until their
respective trigger point has occurred and data was available.)

## 1. Server setup (Ubuntu 22.04)

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip

sudo mkdir -p /opt/livescore-api
sudo chown $USER:$USER /opt/livescore-api
# copy this project's files into /opt/livescore-api

cd /opt/livescore-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Installs Chromium + required OS libraries for Playwright
python -m playwright install --with-deps chromium

cp .env.example .env
nano .env   # set a real API_KEY, review the other settings
```

## 2. Run it manually first (sanity check)

```bash
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
curl -s -X POST http://127.0.0.1:8000/control/start \
  -H "X-API-Key: <your API_KEY>" -H "Content-Type: application/json" \
  -d '{"interval_seconds": 30}'

curl -s http://127.0.0.1:8000/control/status -H "X-API-Key: <your API_KEY>"

# after a cycle or two:
curl -s "http://127.0.0.1:8000/matches?live_only=true" -H "X-API-Key: <your API_KEY>"
```

## 3. Install as a systemd service

```bash
sudo useradd -r -s /usr/sbin/nologin livescore
sudo chown -R livescore:livescore /opt/livescore-api

sudo cp livescore-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now livescore-api
sudo systemctl status livescore-api
journalctl -u livescore-api -f
```

The service listens on `127.0.0.1:8000` only (not exposed to the internet).
Put it behind Nginx (or your existing reverse proxy) on your VPS and let your
website call it over your internal network / a proxied path, e.g.:

```nginx
location /livescore-api/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_set_header Host $host;
}
```

Your website's backend (not the browser) should hold the `X-API-Key` and call
this API server-to-server — don't expose the key to client-side JS.

## API reference

All endpoints require header `X-API-Key: <your key>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/control/start` | Start the scrape loop. Body: `{"interval_seconds": 30, "recheck_seconds": 30}` (both optional) |
| POST | `/control/stop` | Stop the scrape loop (stops burning bandwidth/browser CPU) |
| GET | `/control/status` | Is it running, current interval, last run time, last error |
| PUT | `/control/config` | Change interval/recheck seconds without stopping |
| GET | `/matches?live_only=true` | List all known football matches (optionally only currently-live ones) |
| GET | `/matches/{match_id}` | One match with its full event timeline |
| GET | `/snapshots/latest` | Bookkeeping info on the most recent scrape cycle |

`interval_seconds` can't be set below `MIN_INTERVAL_SECONDS` (default 15) — that
floor exists specifically so this can't accidentally be configured into
hammering varzesh3.com.

## Files

```
app/
  config.py     env-driven settings
  database.py   SQLAlchemy engine/session
  models.py     Match / MatchEvent / Snapshot / RuntimeConfig tables
  scraper.py    Playwright automation + in-page DOM extraction (the JS lives here)
  parser.py     turns scraped dicts into DB rows, with de-duplication
  scheduler.py  the interval loop; owns start/stop/status
  main.py       FastAPI routes + auth
livescore-api.service   systemd unit
.env.example            copy to .env
```
