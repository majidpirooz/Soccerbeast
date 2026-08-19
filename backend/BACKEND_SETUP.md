# Backend Setup -- how the three services fit together

Soccer Beast's backend is actually **three separate processes**:

```
+----------------------+      +----------------------------+      +-------------------------+
|  vendor-matches-      |      |  This backend               |      |  vendor-livescore-api   |
|  statistics            |      |  (Node/Express)             |      |  (Python/FastAPI)       |
|  (Python CLI, NOT      |<-----|  src/server.js               |----->|  Playwright + varzesh3  |
|  a running service)    | read |  Port 4000                   | HTTP |  Port 8000              |
|  writes football.db    |file  |                              |      |                         |
+------------------------+      +--------------+----------------+      +-------------------------+
                                                |
                                                | serves
                                                v
                                      React frontend (Vite build)
                                      soccer-beast-components/
```

- **`vendor-matches-statistics`** -- not a service. Run manually or on a cron;
  it writes to a SQLite file (`football.db`). This backend reads that file
  directly (read-only) for standings/fixtures, and shells out to its
  `cli.py` for the admin panel's "Run Now" button.
- **`vendor-livescore-api`** -- a real, always-running FastAPI service. This
  backend proxies it server-to-server, keeping its API key out of the
  browser entirely (per that service's own README).
- **This backend** -- owns its own SQLite database (`data/soccerbeast.db`)
  for everything neither Python service knows about: users, leagues,
  predictions, team aliases, arenas.

## Why `competition_definitions` exists

`football.db` has no "competition" or "season" entity -- just a free-text
`competition` label scraped per match, and a team's `country` (the source
Excel sheet's name). To show one coherent "Premier League 2026-27" standings
table, something has to say which country + which scraped label + which
date range that corresponds to. `competition_definitions` is that mapping,
and it's admin-configured (there's no UI for it yet -- insert rows directly
for now; see ROADMAP.md).

## Local development setup

```bash
# 1. This backend
cd soccer-beast-backend
npm install
cp .env.example .env
npm run migrate
npm run seed-strings  # populates real EN/FA UI text -- see ROADMAP.md's "Bug #3 fix"
npm run dev          # restarts on change

# 2. MatchesStatistics (only needed when you actually want real football
#    data -- everything above works with an empty football.db too, it'll
#    just return empty standings/fixtures)
cd vendor-matches-statistics
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium   # if the online loader needs it -- check that repo's own README
python3 cli.py --db ../soccer-beast-backend/vendor-matches-statistics/football.db init-db
python3 cli.py --db ../soccer-beast-backend/vendor-matches-statistics/football.db import-teams --xlsx teams.xlsx
python3 cli.py --db ../soccer-beast-backend/vendor-matches-statistics/football.db scrape --mode online
cd ../soccer-beast-backend && npm run sync-teams   # pulls those teams into this backend's own DB

# 3. livescore-api (only needed for live scores)
cd vendor-livescore-api
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # set its own API_KEY -- must match this backend's LIVESCORE_API_KEY
uvicorn app.main:app --host 127.0.0.1 --port 8000

# 4. Frontend
cd soccer-beast-components
echo "VITE_API_BASE_URL=http://localhost:4000" > .env
npm install && npm run dev
```

At this point: sign up as the first user (they don't automatically become
admin -- promote them manually, see below), everything else works against
real data as each of the three services comes online.

### Promoting the first admin

There's no signup flow that grants admin -- by design, spec doesn't describe
one (an admin creating another admin isn't in scope of what was specced).
For now:

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/soccerbeast.db');
db.prepare(\"UPDATE users SET tier='admin_top' WHERE username='YOUR_USERNAME'\").run();
"
```

## VPS deployment (extending `soccer-beast-components/DEPLOY.md`)

That doc covers deploying the frontend alone. Layer this backend in:

1. **Get all three projects onto the VPS** (same as the frontend -- `git
   clone` or `scp`, ideally all under one parent directory so the relative
   `MATCHES_STATISTICS_DIR` path in `.env` doesn't need adjusting).

2. **Python services need their own venvs on the VPS**, same as local dev
   above. `vendor-livescore-api` already ships a `livescore-api.service`
   systemd unit -- install it (`sudo cp livescore-api.service /etc/systemd/system/`,
   `sudo systemctl enable --now livescore-api`) so it survives reboots.
   `vendor-matches-statistics` doesn't need a systemd unit (it's invoked by
   this backend, not standing alone) -- but this backend itself does need one:

   ```ini
   # /etc/systemd/system/soccerbeast-backend.service
   [Unit]
   Description=Soccer Beast backend
   After=network.target

   [Service]
   WorkingDirectory=/home/YOUR_USER/soccerbeast/soccer-beast-backend
   ExecStart=/usr/bin/node src/server.js
   Restart=on-failure
   EnvironmentFile=/home/YOUR_USER/soccerbeast/soccer-beast-backend/.env
   User=YOUR_USER

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable --now soccerbeast-backend
   ```

3. **Extend the host nginx config** from `DEPLOY.md` to also proxy `/api/`
   to this backend, alongside the existing frontend proxy:

   ```nginx
   server {
       listen 80;
       server_name soccerbeast.duckdns.org;

       location /api/ {
           rewrite ^/api/(.*)$ /$1 break;
           proxy_pass http://127.0.0.1:4000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
       }
   }
   ```

   (`vendor-livescore-api` on port 8000 is *not* exposed here -- it's only
   ever called by this backend, server-to-server, never directly by nginx
   or the browser.)

4. **Rebuild the frontend with the real API URL**:
   ```bash
   cd soccer-beast-components
   # docker-compose.yml's VITE_API_BASE_URL build arg:
   #   VITE_API_BASE_URL: "https://soccerbeast.duckdns.org/api"
   docker compose up -d --build
   ```
   Then `sudo nginx -t && sudo systemctl reload nginx` after any config edit.

5. **Verify**: `curl https://soccerbeast.duckdns.org/api/health` should
   return `{"ok":true}` through the full chain (browser -> nginx -> this
   backend).
