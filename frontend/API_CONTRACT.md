# Soccer Beast — API Contract (v1)

The spec (§1) only commits to a stack — "Node.js backend, React frontend,
Docker + nginx, SQLite via better-sqlite3" — it doesn't define endpoints.
This document is that missing contract: what `src/api/*.js` calls, so a
backend can be built to match. Change it in lockstep with `src/api/` if a
route needs to move.

Conventions:
- All paths are relative to `API_BASE_URL` (see `src/api/client.js`).
- All bodies/responses are JSON except file uploads (`multipart/form-data`).
- Authenticated routes require `Authorization: Bearer <token>`.
- `[Top]` = Top Tier Admin only. `[Low+]` = Low Tier Admin or above. Unmarked
  admin routes are reachable by both tiers, scoped server-side to what that
  tier is allowed to touch (e.g. a Low Tier Admin's `GET /leagues` should
  only return leagues they created, per spec §7.6).

## Auth

| Method & Path | Body | Response | Notes |
|---|---|---|---|
| `POST /auth/signin` | `{username, password}` | `{token, user}` | spec §6.2 |
| `POST /auth/join` | `{username, password, invitationCode?, telegramId?, email?}` | `{token, user, joinedLeague?}` | `joinedLeague` present only when `invitationCode` was valid — frontend then shows the "stay in Main League?" prompt (spec §6.4) |
| `POST /auth/recover` | `{username}` | `{result: 'sent' \| 'invalid-username'}` | Never emails a reset link — generates a password and notifies Admin, who relays it manually (spec §6.3) |
| `GET /auth/me` | — | `{user}` \| `401` | Used on app load to restore a session from a stored token |
| `POST /auth/signout` | — | `204` | |

## Home (spec §6.1)

| Method & Path | Response |
|---|---|
| `GET /home` | `{heroMatch, miniMatches: Match[], nextMatch: Match, latestMatches: Match[]}` — `heroMatch`/`miniMatches` reflect whatever Top Tier Admin has configured as slides; `nextMatch` follows the signed-in/signed-out fallback logic in spec §6.1 server-side |

## Strings / i18n (spec §1)

| Method & Path | Response |
|---|---|
| `GET /strings` | `{ [key]: {en, fa} }` — public, no auth. Every UI string the frontend's `t()` renders, keyed for O(1) lookup. Distinct from `GET /admin/strings` (Top Tier only, array-of-rows shape for the String Editor's table) — same underlying table, different shape for a different consumer. |

## Live (spec §6.7)

| Method & Path | Response |
|---|---|
| `GET /live?date=YYYY-MM-DD` | `{days: [{id,label,sublabel}], leagueGroups: [{id,name,matches: Match[]}], lastUpdate, highlightedMatchIds}` |

`Match` (shared shape, spec §6.10's 10 fields):
```json
{
  "id": "m-198",
  "competition": { "name": "Premier League", "round": "Matchday 12" },
  "home": { "id": "tot", "name": "Tottenham", "short": "TO", "crest": null },
  "away": { "id": "eve", "name": "Everton", "short": "EV", "crest": null },
  "homeScore": 1, "awayScore": 1,
  "status": "open | locked | live | finished",
  "minute": "67'",
  "kickoffLabel": "Fri 17:30",
  "predictionSplit": { "home": 44, "draw": 22, "away": 34 },
  "events": [{ "id": "e1", "minute": "23'", "type": "goal", "text": "Son (Tottenham)" }]
}
```

## Leagues / Standings (spec §6.5)

| Method & Path | Response |
|---|---|
| `GET /competitions` | `[{id, name}]` — for the league selector dropdown |
| `GET /competitions/:id/seasons` | `[{id, label}]` — newest first |
| `GET /competitions/:id/standings?season=:seasonId` | `{rows: StandingsRow[]}` |
| `GET /competitions/:id/fixtures?season=:seasonId` | `{weeks: FixtureWeek[]}` |

```json
// StandingsRow
{ "rank": 1, "change": "up|down|same", "team": {...}, "p":11,"w":8,"d":2,"l":1,"gf":27,"ga":11,"pts":26, "form": ["w","d","l","w","w"] }
// FixtureWeek
{ "id": "w12", "label": "Week 12", "open": true, "fixtures": [{ "id":"f1","time":"17:30","home":{...},"away":{...},"score":"VS" }] }
```

## Match detail (spec §6.8)

| Method & Path | Response |
|---|---|
| `GET /matches/:id` | `{...Match, venue, referee, lineups: {home,away}, stats: [{label,home,away,unit?}]}` |

## Prediction (spec §6.9, §7.4)

| Method & Path | Body | Response |
|---|---|---|
| `GET /prediction-leagues` (mine) | — | `[{id, name}]` |
| `GET /prediction-leagues/:id/leaderboard` | — | `{rows: LeaderboardRow[]}` |
| `GET /prediction-leagues/:id/matches-to-predict` | — | `[{match, mode: 'normal'\|'combined', initial?, initial2?, enteredByAdmin}]` |
| `POST /predictions` | `{leagueId, matchId, picks: [{home,away}]}` | `204` — `picks` has 1 entry for Normal mode, 2 for Combined |

```json
// LeaderboardRow
{ "rank":1, "change":"up", "user": {"id":"u1","name":"Majid","initials":"MJ"}, "exact":9, "pts":142, "trophies": {"gold":true,"diamond":true} }
```

## Profile (spec §6.11 regular-user bullets)

| Method & Path | Body | Response |
|---|---|---|
| `GET /profile` | — | `{user, progress, mode, lang, previousLeagues}` |
| `PATCH /profile/account` | `{username?, password?}` (avatar via `/profile/avatar`) | `204` |
| `POST /profile/avatar` (multipart) | `file` | `{avatarUrl}` |
| `PATCH /profile/preferences` | `{mode?, lang?}` | `204` — mode change takes effect from the next unlocked match, enforced server-side (spec §7.4) |
| `GET /profile/compare?userIds=u1,u2&metric=weeklyPoints` | — | `{series: [{user, points: number[]}]}` |
| `GET /users` | — | `[{id, name}]` — for the compare-user picker and admin proxy-pick picker |
| `POST /prediction-leagues` | `{name}` | `{league}` |

## Admin (spec §6.11, §2, §7.6, §9)

| Method & Path | Body | Response | Tier |
|---|---|---|---|
| `GET /admin/scraper-status` | — | `{matchesStatistics, liveScoreApi}` | `[Top]` |
| `POST /admin/matches-statistics/run` | — | `202` | `[Top]` |
| `PATCH /admin/matches-statistics/schedule` | `{mode, scheduled, cron}` | `204` | `[Top]` |
| `POST /admin/matches-statistics/upload` (multipart) | `file` (html or xlsx, per `mode`) | `202` | `[Top]` |
| `PATCH /admin/live-score-api/schedule` | `{dailyStartTime, preMatchLeadMinutes, postMatchLingerMinutes, pollIntervalSeconds}` | `204` | `[Top]` |
| `POST /admin/live-score-api/start` \| `/stop` | — | `204` | `[Top]` |
| `GET /admin/unmatched-teams` | — | `[{id, source, rawText, language, seenAt}]` | `[Top]` |
| `POST /admin/unmatched-teams/:id/link-alias` | `{teamId}` | `204` | `[Top]` |
| `POST /admin/unmatched-teams/:id/create-team` | `{name}` | `{team}` | `[Top]` |
| `POST /admin/matches` (manual entry) | `{competitionId, homeTeam, awayTeam, kickoff, arena?, reasonTag, watchLinks}` | `{match}` | both |
| `GET /admin/competition-types` | — | `[{id, name, type}]` | both — the manual-entry form's competition dropdown |
| `GET /admin/match-pool-candidates?leagueId=&weekId=` | — | `[Match & {inPool}]` | both |
| `GET /admin/match-pool-weeks` | — | `[{id, label}]` | both — populates the week selector in the match-pool picker |
| `POST /admin/match-pool` | `{leagueId, weekId, matchIds}` | `204` | both |
| `GET /admin/selected-matches` | — | `[{id, match, week, league, published}]` | both |
| `POST /admin/selected-matches/:id/unpublish` | — | `204` | both |
| `GET /admin/matches?query=` | — | `[Match & {isKnockout, status, result}]` | both |
| `PATCH /admin/matches/:id/result` | `{normalTime, extraTime?, penalties?}` | `204` | both — available regardless of match status |
| `DELETE /admin/matches/:id` | — | `204` | both — available regardless of published/finished state |
| `GET /admin/teams` | — | `[{id, name, crest}]` | both |
| `POST /admin/teams/:id/crest` (multipart or `{url}`) | `file` or `{url}` | `204` | both — server enforces Low Tier's "crest-less teams only" rule |
| `GET /admin/arenas` | — | `[{id, team, arenas}]` | both |
| `POST /admin/arenas/import` (multipart) | `file` (xlsx) | `202` | `[Top]` |
| `POST /admin/arenas/:teamId` | `{arena}` | `204` | both |
| `GET /admin/leagues` | — | `[{id, name, tier, members, matchPool, code, status}]` | both — Low Tier sees only leagues they created |
| `POST /admin/leagues` | `{name}` | `{league}` | both |
| `POST /admin/leagues/:id/finish` | — | `204` | both — rejected server-side for Main League |
| `POST /admin/leagues/:id/regenerate-code` | — | `{code}` | both |
| `GET /admin/strings` | — | `[{id, key, en, fa}]` | `[Top]` |
| `PATCH /admin/strings` | `{[stringId]: {en?, fa?}}` | `204` | `[Top]` |
| `GET /admin/proxy-predictions/log` | — | `[{id, user, match, pick, enteredBy, at}]` | `[Top]` |
| `POST /admin/proxy-predictions` | `{userId, matchId, home, away}` | `204` | `[Top]` |

## Error shape

Every non-2xx response body:
```json
{ "error": { "code": "invalid_username", "message": "No account with that username." } }
```
`src/api/client.js` throws an `ApiError` with `.code`, `.message`, `.status` for all of these.
