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
