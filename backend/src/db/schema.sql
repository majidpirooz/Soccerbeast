-- soccerbeast.db — this backend's own data. Separate from:
--   * vendor-matches-statistics/football.db (read-only, owned by that CLI tool)
--   * vendor-livescore-api's livescore.db (never touched directly — always via its API)
--
-- Tables marked "not yet wired to a route" have the schema in place but no
-- endpoint uses them yet — see ROADMAP.md for what's real vs. scaffolded.

CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    username            TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    telegram_id         TEXT,
    email               TEXT,
    tier                TEXT NOT NULL DEFAULT 'user' CHECK (tier IN ('user','admin_low','admin_top')),
    prediction_mode     TEXT NOT NULL DEFAULT 'normal' CHECK (prediction_mode IN ('normal','combined')),
    lang                TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en','fa')),
    avatar_path         TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- Password-recovery requests, per spec §6.3: no email reset link, a new
-- password is generated and relayed to Admin manually. This table is Admin's
-- inbox for that — the "relay it to the user" step itself stays a human task.
CREATE TABLE IF NOT EXISTS password_recovery_requests (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_password  TEXT NOT NULL,      -- plaintext, deliberately — Admin needs to read it to relay it
    relayed_at          TEXT,               -- NULL until Admin marks it as sent
    created_at          TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Canonical football data — teams, arenas, and the mapping onto the two
-- external sources' own identifiers.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS teams (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    name                    TEXT NOT NULL,
    persian_name            TEXT,
    country                 TEXT,
    crest_path              TEXT,
    matchstats_team_id      INTEGER,        -- teams.id in vendor-matches-statistics/football.db, once synced
    created_at              TEXT DEFAULT (datetime('now')),
    UNIQUE(name, country)
);

CREATE TABLE IF NOT EXISTS arenas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_default  INTEGER NOT NULL DEFAULT 0,   -- SQLite has no BOOLEAN; 0/1
    created_at  TEXT DEFAULT (datetime('now'))
);

-- The resolution layer for spec §4.1. livescore-api reports free-text team
-- names scraped from varzesh3 (Farsi and English mixed); this maps each
-- distinct raw string onto a canonical team_id once an admin resolves it.
-- Rows with team_id IS NULL are exactly what the Unmatched Team Names admin
-- panel lists.
CREATE TABLE IF NOT EXISTS team_aliases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_text    TEXT NOT NULL UNIQUE,
    source      TEXT NOT NULL DEFAULT 'livescore_api',
    language    TEXT,
    team_id     INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    first_seen_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

-- Admin-configured mapping from an app-level "competition" (what the
-- Leagues page's dropdown shows) onto the free-text `competition` values
-- and team `country` values found in vendor-matches-statistics/football.db,
-- since that DB has no competition/season entity of its own (see
-- BACKEND_SETUP.md's "Why competition_definitions exists" section).
CREATE TABLE IF NOT EXISTS competition_definitions (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name                TEXT NOT NULL,
    country_filter               TEXT,          -- matches teams.country in football.db
    matchstats_competition_label TEXT,          -- matches matches.competition text in football.db (Farsi)
    season_label                 TEXT NOT NULL,
    season_start_date            TEXT,          -- ISO date, inclusive
    season_end_date               TEXT,          -- ISO date, inclusive
    is_current_season            INTEGER NOT NULL DEFAULT 0,
    created_at                    TEXT DEFAULT (datetime('now'))
);

-- Snapshots of computed standings, so the rank-change (up/down/same) arrow
-- has something to compare against. Written by the standings endpoint
-- itself (at most once per ~20h per competition_definition) rather than a
-- separate cron job — see src/services/standings.js.
CREATE TABLE IF NOT EXISTS standings_snapshots (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_definition_id INTEGER NOT NULL REFERENCES competition_definitions(id) ON DELETE CASCADE,
    team_id                 INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    rank                    INTEGER NOT NULL,
    points                  INTEGER NOT NULL,
    captured_at             TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_standings_snapshots_lookup
    ON standings_snapshots(competition_definition_id, team_id, captured_at);

-- ---------------------------------------------------------------------------
-- App-specific matches: only matches admin has manually entered or added to
-- a prediction pool live here (NOT every fixture football360.ir has — those
-- are read live from football.db for Home/Live/Leagues browsing instead).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_matches (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source               TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','matchstats')),
    competition_name     TEXT,
    competition_round    TEXT,
    home_team_id         INTEGER NOT NULL REFERENCES teams(id),
    away_team_id         INTEGER NOT NULL REFERENCES teams(id),
    kickoff_utc          TEXT,
    arena_id             INTEGER REFERENCES arenas(id),
    reason_tag           TEXT,                  -- 'friendly' | 'knockout_round' | 'group_stage'
    watch_links_json     TEXT,                  -- JSON array of URLs
    is_knockout          INTEGER NOT NULL DEFAULT 0,
    status                TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','locked','live','finished')),
    livescore_match_id   TEXT,                  -- links to livescore-api's own match_id, once matched
    home_score           INTEGER,               -- the recorded scoreline used for prediction scoring (= normal time)
    away_score           INTEGER,
    normal_time_home     INTEGER,
    normal_time_away     INTEGER,
    extra_time_home      INTEGER,
    extra_time_away      INTEGER,
    penalties_home       INTEGER,
    penalties_away       INTEGER,
    created_by_user_id   INTEGER REFERENCES users(id),
    deleted_at           TEXT,                  -- soft delete, per spec's "delete even after finished" requirement
    created_at           TEXT DEFAULT (datetime('now')),
    updated_at           TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Prediction leagues (spec §7) — schema only, not yet wired to routes.
-- See ROADMAP.md: scoring rules (§7.2/§7.3) are non-trivial enough that
-- shipping a half-correct implementation felt worse than an honest stub.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS prediction_leagues (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    created_by_user_id  INTEGER NOT NULL REFERENCES users(id),
    match_pool_mode     TEXT NOT NULL DEFAULT 'own' CHECK (match_pool_mode IN ('own','shared_main')),
    invitation_code     TEXT UNIQUE,
    is_main_league      INTEGER NOT NULL DEFAULT 0,   -- exactly one row ever has this = 1
    status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    season_label         TEXT,
    created_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS league_memberships (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id   INTEGER NOT NULL REFERENCES prediction_leagues(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(league_id, user_id)
);

CREATE TABLE IF NOT EXISTS league_match_pool (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id   INTEGER NOT NULL REFERENCES prediction_leagues(id) ON DELETE CASCADE,
    match_id    INTEGER NOT NULL REFERENCES app_matches(id) ON DELETE CASCADE,
    week_label  TEXT,
    published   INTEGER NOT NULL DEFAULT 1,
    UNIQUE(league_id, match_id)
);

CREATE TABLE IF NOT EXISTS predictions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id           INTEGER NOT NULL REFERENCES prediction_leagues(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id            INTEGER NOT NULL REFERENCES app_matches(id) ON DELETE CASCADE,
    pick_index          INTEGER NOT NULL DEFAULT 0,   -- 0 for Normal mode; 0 or 1 for Combined mode's two picks
    predicted_home      INTEGER NOT NULL,
    predicted_away      INTEGER NOT NULL,
    entered_by_admin_id INTEGER REFERENCES users(id), -- set when this was a proxy entry (spec §6.9/§6.11)
    created_at           TEXT DEFAULT (datetime('now')),
    UNIQUE(league_id, user_id, match_id, pick_index)
);

-- Rank-change snapshots for the prediction leaderboard, same purpose and
-- write cadence as standings_snapshots -- see src/services/scoring.js.
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id   INTEGER NOT NULL REFERENCES prediction_leagues(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank        INTEGER NOT NULL,
    points      INTEGER NOT NULL,
    captured_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_lookup ON leaderboard_snapshots(league_id, user_id, captured_at);

-- ---------------------------------------------------------------------------
-- Admin content — schema only, not yet wired to routes (see ROADMAP.md).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ui_strings (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    key     TEXT NOT NULL UNIQUE,
    en      TEXT,
    fa      TEXT
);

CREATE TABLE IF NOT EXISTS admin_config (
    key         TEXT PRIMARY KEY,
    value_json  TEXT NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now'))
);
