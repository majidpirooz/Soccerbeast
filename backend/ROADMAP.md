# Soccer Beast Backend — Roadmap

This is the honest accounting referenced throughout the code comments: what's
real and tested, what's a documented stub, and what isn't started. Written
so nobody has to grep for "ROADMAP.md" comments to piece this together.

## Built and verified (real HTTP calls against a real server, not just "looks right")

- **Auth** — join, signin, session restore (`/auth/me`), password recovery
  (generates a real password, stores it for Admin to relay per spec §6.3).
  Verified: wrong password rejected, correct password accepted, join with a
  valid/invalid invitation code both behave correctly.
- **Tier-based authorization** — `requireAuth` + `requireAdminTier`, applied
  per-route (not router-wide — see "Bugs found and fixed" below for why that
  distinction mattered). Verified: a `user`-tier account gets 403 on admin
  routes; an `admin_low` account gets into `admin_low` routes but 403 on
  `admin_top`-only ones, regardless of route registration order.
- **Team standings + fixtures**, computed live from `vendor-matches-statistics`'s
  `football.db` — verified against a hand-built fixture with the exact schema
  and the real double-row-per-match quirk (each match is scraped once per
  team), confirming the dedup and aggregation produce a mathematically
  correct table (points, goal difference tiebreak, form).
- **Prediction scoring + leaderboard + trophies** (spec §7.1–7.4) — the full
  points table, Combined-mode's "higher of two picks" rule, and the Golden
  Trophy's multi-step tiebreak chain. Verified end-to-end: two users predict
  a match, admin enters the result, the leaderboard reflects the correct
  points and trophy awards.
- **Unmatched Team Names** (spec §4.1) — the actual resolution flow: an
  unresolved alias appears in `/admin/unmatched-teams`, `create-team`
  resolves it and it disappears from that list. Verified.
- **Manual match entry, result editing (including knockout's 3-field split),
  soft-delete, match pool (candidates/publish/selected/unpublish)** — all
  real CRUD against `app_matches` / `league_match_pool`, verified via curl.
- **League management** (create, finish, regenerate code, Main League
  protected from finishing) — verified.
- **Arenas** (list, add, first-arena-becomes-default) — verified.
- **Team crests** (upload or URL, Low Tier's "crest-less teams only"
  restriction enforced server-side) — code-reviewed, not yet curl-tested
  with an actual file upload (multer wiring is standard, low risk, but
  "low risk" isn't the same as "verified" — worth an explicit test pass).
- **`livescore-api` proxy** (`/live`, `/matches/:id`, admin start/stop/config)
  — code-reviewed against that service's own README and OpenAPI-shaped
  responses, **not tested against a running instance** (would need Playwright
  + a live varzesh3.com page in this environment, which wasn't available).
  The request/response shapes should be right; the actual network round-trip
  isn't proven.
- **`MatchesStatistics` CLI integration** (`/admin/matches-statistics/run`,
  schedule) — the `spawn()` call is code-reviewed against that project's
  actual `cli.py` argument parser, **not run against a real Python venv**
  in this environment (no network access to install Playwright/pandas here).

## Bugs found and fixed during this pass

1. **`app_matches` was missing `home_score`/`away_score` columns** that
   `PATCH /admin/matches/:id/result` and the scoring engine both assumed
   existed. Found via the first end-to-end scoring test (it 500'd), fixed in
   `schema.sql`, re-verified.
2. **`getFixtures` returned raw DB rows instead of the standard
   `{id,name,short,crest}` team shape** every other route uses — found by
   asserting the response shape in a test, not just eyeballing it. Fixed
   with a shared `shapeTeam()` helper now used by both `getStandings` and
   `getFixtures`.
3. **Router-wide `router.use(requireAuth, requireAdminTier(...))` was a
   real authorization bug**, not just a style issue: because every admin
   router is mounted at the same base path, Express runs each router's
   top-level `.use()` for *any* request that reaches it, regardless of
   whether that router owns a matching route. A Low Tier Admin hitting a
   legitimate `admin_low` route (e.g. `/admin/teams`) was getting
   incorrectly blocked by an *earlier-registered* `admin_top`-only router's
   blanket check. Fixed by moving auth to per-route middleware (`...LOW,` /
   `...TOP,` spread into each route definition) across all nine admin route
   files. Verified with the exact failing scenario before and after.
4. **`GET /home` never existed** — a plain miss, not a design gap. The
   frontend's `HomePageContainer` called it on every load and would have
   404'd immediately. Added `src/routes/home.js`, backed by real
   `app_matches` queries (soonest upcoming match, most recently finished
   ones). Note: `API_CONTRACT.md` describes `heroMatch`/`miniMatches` as
   admin-curated "slides" — that admin feature (a slides table + panel to
   manage it) was never built; this route's hero/mini-row are a reasonable
   stand-in (soonest upcoming match, a few other upcoming ones), not that
   feature. Also fixed a related crash: `HomePage.jsx` accessed
   `heroMatch.home.name` / `nextMatch.status` with no null-safety, which a
   fresh deploy (zero matches until an admin adds some) would hit
   immediately since `GET /home` correctly returns `null` for both fields
   rather than fabricating fake matches. Added empty-state rendering for both.
5. **`GET /matches/:id` only ever called `livescore-api`** — any match id
   belonging to `app_matches` (manually entered matches, or anything reached
   from the Prediction/Leagues pages) would either 404 or, worse, silently
   fetch the wrong match if the id happened to also exist in
   `livescore-api`'s own id space. Fixed by adding `src/routes/matchDetail.js`,
   which tries `app_matches` first and falls back to `livescore-api` --
   removed the conflicting duplicate route definition that used to live in
   `live.js` (two Express routes can't both own the same path; whichever
   registers first silently wins). See that file's own doc comment for the
   remaining disambiguation caveat (id collision between the two sources is
   theoretically possible until spec §4.2's proper match-linking is built).
6. **Manual match entry silently discarded the `arena` field** — accepted
   in the request body, never written to `app_matches.arena_id`, and no
   fallback to the home team's default arena either (spec §9 requires this
   default). Found while verifying fix #5 (a freshly created match's `venue`
   came back `null` despite the home team having a seeded default arena).
   Fixed with a `resolveArenaId()` helper in `admin/matches.js`: explicit
   arena name → look up or create it for that team; no arena specified →
   fall back to that team's `is_default` arena. Verified both paths.

## Documented stubs (return 501, don't pretend to work)

- `POST /admin/matches-statistics/upload` — offline HTML / online workbook
  file upload. The CLI itself supports both (`scrape --mode offline --dir`,
  `import-teams --xlsx`); this needs multer + a temp-dir handoff to the same
  `spawn()` pattern `runScrapeNow()` already uses.
- `POST /admin/arenas/import` — bulk Excel import. Reference for the
  expected column layout: `vendor-matches-statistics/sources/excel_loader.py`.

## Known gaps (not stubbed, just not attempted)

- **`livescore-api` has no concept of arbitrary dates** — it only knows
  whatever it's scraped from varzesh3's "today" page during its running
  window. The frontend's Live page day-tabs (yesterday/today/tomorrow)
  can't be genuinely backed by this data source as-is. `GET /live?date=`
  accepts the parameter and ignores it. A real fix would need either a
  separate historical-results source or accepting that day-tabs only make
  sense for "today," and reworking that part of the frontend.
- **No linking between a `livescore-api` match and an `app_matches` row.**
  Spec §4.2 describes matching by kickoff-time window (±15 min) + team
  identity — the team-alias resolution half of that is built
  (`teamAlias.js`), but nothing yet uses it to set `app_matches.livescore_match_id`,
  which means the Live page's "highlighted = in one of your leagues" feature
  (`highlightedMatchIds`) always returns empty. This is probably the single
  highest-value next piece of work.
- **`ManualMatchEntryPanel`'s frontend form collects free-text team names,
  not team IDs** — `POST /admin/matches` expects an existing team's id or
  exact name match. A real team-picker (search-as-you-type against
  `GET /admin/teams`) needs to replace that form field, or this route needs
  to accept "team doesn't exist yet, create it" the way `create-team` does
  for unmatched aliases.
- **`ProxyPredictionPanel` has no league selector** — `POST /admin/proxy-predictions`
  currently always targets Main League. Needs a league dropdown added to
  that frontend panel and a `leagueId` field threaded through.
- **Season-leaderboard tiebreak order (Golden vs. Diamond) is a documented
  guess** — spec §7.3 says both are used as tiebreakers but doesn't state
  which takes priority. Currently Golden-then-Diamond; flagged in
  `scoring.js` as the specific line to change if that guess turns out wrong.
- **Week boundaries in `getFixtures` are computed, not real** —
  `football.db` has no matchday number, only dates, so weeks are
  7-day buckets from the competition's configured season start, not the
  competition's actual matchday numbering.
- **No automated test suite** — every verification in this pass was a
  manual curl session against a running server (see the transcript this
  document summarizes). `package.json` has a `test` script pointing at
  `node --test test/`, but that directory doesn't exist yet. The manual
  test sequences in this pass would be a reasonable starting point to turn
  into actual `node:test` files.
- **File upload routes untested with a real file** (crest upload, avatar
  upload) — code path is standard multer, reviewed but not curl-tested with
  `-F file=@...`.
- **No rate limiting, no request logging, no production error monitoring.**
- **CORS is wide open (`cors()` with no options)** — fine for development,
  should be locked to the actual frontend origin before going live.

## Bug #3 fix — real translation infrastructure (not just an RTL toggle)

Before this pass, the FA/EN toggle correctly mirrored the layout (`dir="rtl"`
genuinely worked) but translated **zero actual text** — every English string
was hardcoded in JSX. This is now fixed with real infrastructure, not a
partial patch:

- **`GET /strings`** (`src/routes/strings.js`) — public, no auth, returns a
  `{key: {en,fa}}` dictionary. Deliberately a different shape from the
  existing Top-Tier-only `GET /admin/strings` (array-of-rows, built for the
  String Editor's table) — same `ui_strings` table, two shapes for two
  different consumers.
- **`scripts/seed-strings.js`** — 98 real key/en/fa entries, run via
  `npm run seed-strings`, idempotent (`INSERT OR IGNORE`, verified by running
  it twice and confirming no duplicate rows). Covers every user-facing page:
  nav, common actions, Home, Live, Leagues, Match, Prediction, Profile, Auth.
- **Frontend**: `src/context/I18nContext.jsx` provides a `useT()` hook.
  Every call site uses `t('key', 'English fallback')` — a missing/unseeded
  key or a slow/failed fetch never breaks the page, it just shows English.
  This was a deliberate design choice to make the rollout safe to do
  incrementally, and it's why every single call site in this codebase
  passes two arguments, not one.
- **Mock mode parity**: `src/mock/stringsData.js` holds the exact same 98
  entries as the backend's seed script (hand-kept in sync, not generated
  from a shared file across the two repos — see that file's own comment).
  `src/api/strings.js`'s mock branch serves from it, so mock mode and a real
  backend behave identically for translation purposes.

**Translated for real**: TopBar, TabBar, Footer, Pill (shared status
labels), HomePage, LivePage, EventsPanel, LeaguesPage, StandingsTable,
MatchPage, MatchHeader, PredictionPage, Leaderboard, PredictionCard,
ProfilePage and all five of its sub-components (AccountSettingsForm,
ProgressStats, PreferencesForm, CreateLeagueCard, PreviousLeaguesList),
SignInPage, JoinPage, PasswordRecoveryPage.

**Deliberately NOT translated (scoping decision, not an oversight)**: the
entire admin panel (all nine `src/components/admin/*` panels plus
`AdminProfilePage`). Admins configuring the site are a much smaller,
presumably English-comfortable audience than the Farsi-speaking friend
group the site is actually for; translating dozens of form labels across
nine panels was judged lower value than finishing every regular-user page
first. Every admin string still renders correctly in English via each
`t()` call's fallback — nothing is missing or blank, it's just not
Persian yet. Extending `seed-strings.js` and wiring `useT()` into those
nine files would follow the exact same pattern already established
everywhere else.

**A real bug this caught during development**: `ProfilePage.jsx`'s tab
list used `.map((t) => ...)` as the loop variable, which would have
silently shadowed `useT()`'s own `t` the moment translation was added to
that file (this exact mistake was made once already, in `MatchPage.jsx`,
and caught before being repeated in `ProfilePage.jsx`). Fixed by renaming
the loop variable and adding an explicit comment warning against it, since
it's an easy trap for any future edit to these files.

**Verification performed** (not just written and assumed correct):
`npm run build` on the frontend succeeded (119 modules, up from 116 —
matching the 3 new files); `GET /strings` was hit against a running
server and returned all 98 keys correctly, confirmed genuinely public
(no auth header needed) while `GET /admin/strings` still correctly
requires one; the string-dictionary data was checked for duplicate keys
and incomplete entries (none found); the `t()` resolution logic itself was
unit-tested against edge cases (unseeded key, no fallback provided, empty
translation value) outside of React, since no browser is available in this
environment to render the actual components.

## Post-deployment bug pass — 20 issues from real usage

After the site was actually deployed, 20 issues came back from hands-on
testing. All 20 were addressed; here's what each one actually was and how
it was fixed (or, for the two that couldn't be fully verified without a
browser, what was done and what's still an open question).

**Real bugs (not just polish):**
- **#15 (Profile page blank for a promoted admin) and #17 (a "Demo only —
  admin tier" switcher visible to every signed-in user)** turned out to be
  the same root cause: `App.jsx` had a leftover local `adminRole` demo
  toggle (defaulting to `'top'`) that decided which Profile view to show,
  completely disconnected from the actual signed-in user's real `tier`.
  Any signed-in user — including a plain `user`-tier account — could see
  and click between "Regular User / Top Tier Admin / Low Tier Admin" in
  the UI. The backend's real tier checks meant no actual data leaked, but
  it was confusing and wrong. Fixed by removing the toggle entirely; a new
  `ProfileRoute` component reads the real `user.tier` from `AuthContext`
  and renders the correct view with no client-side override possible.
  A React `ErrorBoundary` was also added at the app root as a safety net —
  it can't fix whatever the *original* blank-page crash's root cause was
  without seeing the actual browser console error, but it turns any future
  crash into a visible message instead of silence.
- **#19 (Create My League did nothing visible)**: it was never actually
  broken — it silently created a league literally named `"New League"`
  every time (no name input existed) and showed no result anywhere. Fixed:
  it now prompts for a real name, and since there's no "My Active Leagues"
  list in the UI yet (see gaps below), shows the invitation code directly,
  since that's the one piece of information the user actually needs.
- **#20 (Save Changes did nothing)**: `ProfilePageContainer` was catching
  every save error with `.catch(console.error)`, which meant the promise
  always resolved successfully even on a real failure (expired session,
  duplicate username, anything) — a user would click Save and see nothing,
  ever, on failure. Fixed by letting errors propagate to
  `AccountSettingsForm`, which now tracks its own save state and shows a
  real inline success/error message. Verified all three paths against a
  running server: successful save, invalid/expired token, duplicate
  username — each now returns a message a real user would understand.
- **#11 ("Message To Administrator" did nothing)**: it was a bare
  `console.log`. Added `POST /contact-admin` (public, works signed-in or
  signed-out via a new `optionalAuth` middleware) storing into a new
  `admin_messages` table, and a real modal on the frontend. There is
  **no admin-facing inbox UI to read these yet** — flagged as a real gap
  below, not hidden.
- **#9 (address bar never changes per page) and #14 (Back button exits the
  site instead of going back)**: both were the same underlying issue — the
  whole app was one URL with in-memory view-switching, never touching
  browser history at all. Fixed with `react-router-dom` (new dependency):
  every page is now a real route (`/live`, `/leagues`, `/match/:id`, etc.),
  the browser Back button works correctly, and the tab title updates per
  page too. `nginx.conf`'s SPA fallback (`try_files ... /index.html`) was
  already written anticipating this change, so no deployment config needed
  updating.
- **#2 (two "Sign In" buttons on mobile / narrow desktop)**: `TopBar`'s own
  inline Sign In button had no responsive guard, so it rendered at every
  width alongside `TabBar`'s Sign In tab (which only shows below the `md`
  breakpoint). Fixed by hiding TopBar's version below `md`.
- **#3 (footer floats in the middle of the page on short pages)**: the app
  root had no flex layout — nothing was telling the footer to stay at the
  bottom when content didn't fill the viewport. Fixed with a standard
  sticky-footer pattern (`min-h-screen flex flex-col` on the root, `flex-1`
  on the main content area).
- **#6 (RTL layout mirroring should be disabled — text-only translation)**:
  `dir="rtl"` was being set on the whole app when Persian was selected,
  mirroring the entire layout (which was the correct interpretation of the
  spec at the time, and the RTL mirroring itself worked correctly — see
  the earlier "RTL pass" section above). The site owner's explicit product
  decision overrides that: `dir` is now hardcoded to `"ltr"` always: only
  `useT()`'s text changes when the language toggle is used, the layout
  never flips. The `rtl:` Tailwind variant and its handful of call sites
  (`Footer`, `PredictionCard`, `Toggle`, `HomePage`, `LivePage`) are now
  dead code — harmless (they simply never match), left in place rather
  than stripped out under time pressure, but worth cleaning up eventually.
- **#18 (should say "Log out", not "Join", once signed in)**: the Join
  button was unconditionally rendered regardless of sign-in state (which
  was actually a literal reading of spec §5.1's "Join: always visible") —
  the site owner's explicit product decision overrides that: signed-in
  users now see a Log out button in that slot instead.

**UI polish (real, but lower-stakes):**
- **#1**: logo doubled in size (was 28px, easy to miss in the nav).
- **#4**: Sign In / Join resized to match the EN/FA toggle's footprint
  (were noticeably larger than every other nav control).
- **#5**: Join switched from gold to the diamond accent, so it doesn't
  visually compete with gold's meaning elsewhere (trophies, primary CTAs).
- **#7, #10, #12**: the logo+site-name header above the Sign In / Join /
  Password Recovery forms was removed from all three — redundant directly
  under the global TopBar's own logo.
- **#8**: the Captcha checkbox was always functional (click → toggles →
  gates the submit button) — what actually looked broken was a dev-only
  note ("placeholder — wire a real provider") rendering directly to end
  users. Removed from the visible UI; the real caveat (this is a manual
  checkbox, not an actual bot-blocking captcha, which needs a real
  provider like hCaptcha/Turnstile with a site key and server-side verify)
  is now only a code comment.
- **#13**: removed the Prediction page's subtitle line per request.
- **#16 (no data anywhere)**: most likely a deployment/data-population
  state, not a bug — a fresh backend has an empty database until an admin
  configures a competition and runs the two data-source integrations (see
  "Local development setup" above). Improved the actual UI regardless: the
  Live and Leagues pages previously rendered nothing at all when empty,
  with zero explanation; both now show a clear message instead of a blank
  area.

**Verification performed**: `npm run build` succeeded after every batch of
changes (125 modules, up from 119); the new `/contact-admin` endpoint was
hit against a running server signed-in, signed-out, and with an empty
message, confirming correct storage and validation in all three cases;
`POST /prediction-leagues` (Create League) was verified to return a real
usable invitation code and correctly promote the creator to `admin_low`;
`PATCH /profile/account` (Save Changes) was verified against success,
invalid-token, and duplicate-username cases, confirming each produces a
message the new frontend error handling can actually display.

**What's still open**: #15's *exact* original crash still isn't confirmed
without a real browser console error — the demo-toggle removal fixes the
most likely cause, and the ErrorBoundary makes any *remaining* cause
visible instead of silent, but neither is a substitute for seeing the
actual error. #16 needs the site owner to confirm whether the backend is
actually deployed and reachable, and whether `MatchesStatistics`/
`livescore-api` have been run at least once — see `BACKEND_SETUP.md`.

## Data extraction API audit — found and fixed the real "doesn't work" cause

Following up on #16, a full field-by-field audit was done against both
vendored Python projects' actual source (not just re-reading earlier notes),
and the `MatchesStatistics` integration turned out to have a genuinely
confirmed, reproduced bug making it non-functional from a fresh deploy.
`livescore-api`'s integration, on the other hand, checked out completely
correct.

### `MatchesStatistics` — confirmed broken, now fixed

**Bug 1 (reproduced with the real CLI, not just read from source):**
`cmd_scrape` calls `db.connect()`, which only opens a raw sqlite3
connection — only `init_db()` runs the actual `CREATE TABLE` statements,
and nothing was ever calling it before a scrape. On a truly fresh
deployment (`football.db` doesn't exist yet), running `scrape` crashes
immediately:
```
sqlite3.OperationalError: no such table: teams
```
Reproduced exactly with a real venv and the real CLI before writing any
fix. **Fixed**: `runScrapeNow()` and the upload handler both now run
`init-db` first (idempotent — it's just `CREATE TABLE IF NOT EXISTS`).

**Bug 2 (also reproduced):** even with the schema initialized, a database
with zero registered teams doesn't error — `cmd_scrape` silently
`return`s with exit code 0. Reproduced this too: it's actually *worse*
than Bug 1 from a debugging standpoint, since the admin panel would show
a green "success" status forever while the site stayed completely empty,
with no signal anything was wrong. **Fixed**: `runScrapeNow()` now checks
the team count first and returns a clear, actionable message ("No teams
registered yet — upload a team-links workbook first") instead of a
misleading success.

**Bug 3 (the actual root cause of "nothing works"):** `POST
/admin/matches-statistics/upload` was a `501` stub from the very first
backend pass — meaning there was **no way at all**, via the web UI, to
get any team data into the system. Without teams, nothing else in this
pipeline can ever produce data, regardless of Bugs 1/2 being fixed.
**Fixed for real**: the endpoint now handles both of `MatchesStatisticsPanel`'s
upload modes:
- `online` mode (the "Team-links workbook" field) → saves the uploaded
  `.xlsx`, runs `import-teams --xlsx <path>` for real.
- `offline` mode (the "Saved HTML files" field, now accepting multiple
  files — `FileUploadField` gained a `multiple` prop for this) → saves
  every file with its **original filename preserved** (critical: the
  Python side's `scan_offline_directory()` matches files by their
  `*-Matches.html` / `*-team-statistic.html` suffix — multer's default
  renaming would have made every file silently unmatched) into a shared
  temp directory, then runs `scrape --mode offline --dir <dir>`
  immediately (offline files are a one-shot "process this batch now"
  action, unlike the persistent online scraping loop).

**How this was verified** — not just written and assumed correct:
1. Built a real Python venv with the vendored tool's actual dependencies
   (`beautifulsoup4`, `openpyxl`, etc. — no Playwright needed for this one)
   and reproduced Bugs 1 and 2 directly against the real, unmodified
   `cli.py` before writing any fix.
2. Built a real, valid `Teams-Links.xlsx` matching the exact column format
   `sources/excel_loader.py` expects, and a real offline HTML fixture
   matching `parsers/matches.py`'s expected DOM structure closely enough
   for the parser to extract an actual match (3-1, finished, with the
   right competition name) — confirming the whole pipeline shape is
   correct, not just the command-line arguments.
3. Ran the **actual Node backend** (not a manual replication of the
   commands) against a genuinely fresh, never-initialized database through
   real HTTP requests: `POST /admin/matches-statistics/run` on a virgin
   database now returns the clear "no teams" message instead of crashing;
   `POST /admin/matches-statistics/upload` with a real multipart workbook
   upload correctly registers 2 teams; a follow-up multipart upload of a
   real offline HTML file correctly scrapes and stores the match, verified
   by reading it back out of the actual `football.db` file afterward.
4. Confirmed `online_loader.py`'s `fetch()` has a real 20-second timeout
   with 2 retries built in — a scrape against an unreachable host degrades
   within a bounded time, it doesn't hang forever. (A live network scrape
   against the real football360.ir couldn't be tested end-to-end in this
   environment — it's not in the sandbox's network allowlist — but the
   request-building code and timeout behavior are confirmed correct up to
   the actual network call.)

### `livescore-api` — audited, found correct, not touched

Every field name used in `src/routes/live.js` / `src/routes/matchDetail.js`
/ `src/services/liveScoreClient.js` was checked directly against the real
`app/main.py`, `app/models.py`, and `app/scraper.py` — endpoint paths,
request body field names (`interval_seconds`, `recheck_seconds`), the exact
Persian string used for finished-match detection (`"نتیجه نهایی"`, copied
character-for-character from the real scheduler code, not retyped), every
event type (`goal`, `own_goal`, `penalty_goal`, `yellow_card`, `red_card`,
`substitution`), and every lineup/stats field name. All matched exactly —
no changes needed. If live scores genuinely aren't showing on the deployed
site, the most likely explanations are: the `livescore-api` Python service
simply isn't running yet (it needs its own systemd service, Playwright, and
a Chromium install — see `BACKEND_SETUP.md`), `LIVESCORE_API_KEY` doesn't
match between the two services' `.env` files, or the two processes can't
reach each other over `127.0.0.1:8000` on the VPS.

### Remaining follow-up (not a confirmed bug, just worth doing)

`runCli()`'s spawned child processes have no explicit timeout in the Node
wrapper itself. The Python side's own `fetch()` retries/timeouts bound how
long a *single URL* can hang, but a scrape across many teams has no
overall ceiling. Worth adding a `maxBuffer`/timeout to the `spawn()` call
as defense-in-depth for a very large team list or an unusually slow
network, but not something that showed up in actual testing.
