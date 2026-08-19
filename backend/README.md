# Soccer Beast Backend

Node.js/Express API backend for Soccer Beast, built against
`soccer-beast-components/API_CONTRACT.md`. Read **`BACKEND_SETUP.md` first**
-- this isn't a single service, it coordinates two vendored Python services
(`vendor-matches-statistics/`, `vendor-livescore-api/`) that already existed
before this backend was written, and understanding how those three pieces
fit together is the actual hard part.

Then read **`ROADMAP.md`** for an honest list of what's built and verified
with real HTTP calls, what's a documented stub, and what's a known gap.

## Quick start

```bash
npm install
cp .env.example .env
npm run migrate
npm run dev
```

Runs on `:4000` against `data/soccerbeast.db` (created automatically).
Works immediately with empty football/live data -- see `BACKEND_SETUP.md`
for wiring up the two vendored Python services for real data.

## Structure

```
src/
  config.js              Env loading
  app.js / server.js     Express app + entry point
  db/                    This backend's own SQLite schema + migration
  lib/                   auth (bcrypt/JWT), error handling
  middleware/             requireAuth, requireAdminTier
  services/               standings.js, scoring.js, teamAlias.js,
                          liveScoreClient.js, appMatches.js, footballDb.js
                          -- the actual business logic; routes are thin
  routes/                 One file per domain, thin -- delegates to services/
  routes/admin/           Nine admin route files, one per admin-panel group

scripts/sync-teams.js    Pulls canonical teams from football.db into this
                          backend's own teams table

vendor-matches-statistics/   The Python CLI tool, as provided (unmodified)
vendor-livescore-api/         The Python FastAPI service, as provided (unmodified)
```

## A note on what "done" means here

Every claim in `ROADMAP.md`'s "Built and verified" section was checked with
an actual running server and real `curl` calls during development -- not
just written and assumed correct. Where something wasn't verified (the two
Python services, specifically -- no Playwright/browser available in the
environment this was built in), that's said explicitly rather than implied.
