# Soccer Beast — React Component Library

This is the React decomposition of the approved Soccer Beast prototype, structured
per `soccer-beast-spec.md`. Every component is **router-agnostic**: navigation is
handled through callback props (`onOpenMatch`, `onNavigate`, etc.), not links or
`<Link>` components, so this drops into React Router, Next.js, or a plain SPA shell
without changes.

## Structure

```
tailwind.config.js        Design tokens (colors, fonts) — single source of truth
src/styles/index.css      Font imports, base styles, custom shape utilities
                           (.clip-pentagon, .clip-trophy-gold, .clip-trophy-diamond)
src/api/                   Fetch client + one adapter module per domain (home, live,
                           leagues, matches, predictions, profile, admin, auth). Every
                           function checks USE_MOCK and falls back to src/mock/*.js when
                           no backend is configured — see "API wiring" below.
src/hooks/useAsync.js      The one data-fetching primitive every container is built on
                           (dependency-free — no react-query/SWR)
src/context/AuthContext.jsx Session state (user, token), wraps api/auth.js
src/containers/            One container per page — owns data-fetching, loading/error
                           states, and handler wiring; the presentational page/component
                           underneath is unchanged and has no idea an API exists

src/mock/data.js           Sample data shaped after the spec §3 entity model — read by
                           src/api/*.js in mock mode, not imported by pages/components
                           directly anymore

src/components/ui/         Atoms: Crest, Avatar, Pill, RankIndicator, TrophyIcon,
                           FormDots, Button, Toggle, TextField, SelectField,
                           FileUploadField, Tag, SectionCard, Captcha, AsyncStates
src/components/match/      MatchCard, EventsPanel, PredictBar  (spec §6.10)
src/components/standings/  StandingsTable, FixtureWeekAccordion  (spec §6.5)
src/components/prediction/ Leaderboard, PredictionCard  (spec §6.9)
src/components/matchpage/  MatchHeader, Timeline, LineupGrid, StatBars  (spec §6.8)
src/components/layout/     TopBar, TabBar, Footer, AuthShell  (spec §5.1, §6.2-6.4)
src/components/profile/    AccountSettingsForm, ProgressStats, RankComparisonChart,
                           PreferencesForm, CreateLeagueCard, PreviousLeaguesList,
                           StayInMainLeaguePrompt  (spec §6.11, §6.4)
src/components/admin/      MatchesStatisticsPanel, LiveScoreApiPanel, UnmatchedTeamsPanel,
                           ManualMatchEntryPanel, SelectedMatchesPanel, MatchPoolPickerPanel,
                           MatchResultEditPanel, MatchResultsBrowser, TeamCrestPanel,
                           ArenaManagementPanel, LeagueManagementPanel, StringEditorPanel,
                           ProxyPredictionPanel  (spec §2, §6.11, §7.6, §9)

src/pages/                 Page-level assemblies: HomePage, LivePage, LeaguesPage,
                           MatchPage, PredictionPage, ProfilePage, AdminProfilePage,
                           SignInPage, PasswordRecoveryPage, JoinPage — pure/presentational,
                           take plain props, no data-fetching of their own
src/App.jsx                Thin shell: navigation state + AuthProvider, defers every data
                           concern to src/containers/
API_CONTRACT.md            The REST contract src/api/*.js is built against — read this
                           before building the real backend
```

## Design tokens (locked)

| Token | Value | Use |
|---|---|---|
| `gold` | `#E8B84B` | primary accent, Golden Trophy, prediction "home" |
| `diamond` | `#63D9E6` | secondary accent, Diamond Trophy, prediction "away" |
| `win` / `draw` / `loss` | `#3FB876` / `#8B9AA0` / `#E1594F` | form dots, stat splits |
| `bg` | `#0A120E` | base background (dark pitch-green) |
| Display font | Anton | scores, headlines, timers |
| Body font | Inter | UI text (swaps to Vazirmatn via `font-family` fallback for `dir="rtl"`) |

**Rank-change indicators** (standings table + leaderboard) are drawn bare —
green up-triangle / red down-triangle / grey dot — with **no enclosing circle**.
This was a locked design revision; don't reintroduce a badge background around
`RankIndicator`.

## Integration checklist

1. `npm install` a React 18+ project with Tailwind CSS configured, then copy
   `tailwind.config.js` (merge if you already have one) and `src/styles/index.css`.
2. Copy `src/` (all of it — `components/`, `pages/`, `containers/`, `api/`,
   `hooks/`, `context/`, `mock/`) into your app.
3. Copy `API_CONTRACT.md` to wherever your backend gets built, and build it to
   match. Set `VITE_API_BASE_URL` (see `.env.example`) once it exists — every
   `src/api/*.js` module switches from mock to real automatically, nothing
   else in the codebase changes.
4. Replace `App.jsx`'s manual `view` state with real routes; every container
   takes the same props regardless of router (they already don't import
   `App.jsx` or know about the view-switch, only navigation callbacks).
5. RTL/Persian: toggle `dir="rtl"` on a root element (already done in `App.jsx`)
   and load Vazirmatn — the `font-display`/`font-body` Tailwind classes already
   fall back to it per-glyph, so mixed EN/FA content (e.g. an English team name
   inside a Persian sentence) renders correctly without any lang-switching logic.

## RTL — how it's implemented

Nearly everything mirrors **automatically** off the `dir="rtl"` attribute with
no extra code, because the components use CSS logical properties instead of
physical left/right ones:

- Alignment: `text-start` / `text-end` instead of `text-left` / `text-right`
- Spacing: `ps-*` / `pe-*` (padding-inline-start/end), `ms-*` / `me-*` instead of `pl-*` / `pr-*` / `ml-*` / `mr-*`
- Borders: `border-s-*` / `border-e-*` instead of `border-l-*` / `border-r-*`
- Absolute position: `insetInlineStart` instead of `left`
- Plain `flex` (not `flex-row-reverse`) — flexbox's main axis is itself
  direction-aware, so a normal `flex` row already reorders under `dir="rtl"`
- CSS Grid columns (e.g. `LineupGrid`'s two columns) reorder the same way

A few things logical properties *can't* express, because they're either a
literal glyph or a deliberate double-reversal, use a small custom `rtl:`
variant defined in `tailwind.config.js` (a plugin, no extra package needed):

- `MatchCard` / `PredictionCard`'s away-team side keeps its `flex-row-reverse`
  on purpose — flex-row-reverse is itself direction-aware, so it correctly
  keeps the crest at the outer edge on whichever physical side the away team
  ends up on. Don't "fix" this to a plain `flex-row`.
- `PredictionCard`'s score-input pair uses `rtl:flex-row-reverse` so the two
  inputs stay under their respective (now-mirrored) team crests.
- Literal arrow glyphs (`Footer`'s "Message To Administrator →",
  `HomePage`'s "See all →") use `rtl:-scale-x-100` to flip the glyph itself.
- `LivePage`'s live-scores toggle knob uses `rtl:-translate-x-4` so it still
  travels toward "on" in the expected direction.

Chevron/expand-collapse indicators (built from a rotated border-corner, in
`EventsPanel`, `FixtureWeekAccordion`, `LeaguesPage`) are intentionally left
alone — they're a symmetric corner shape indicating open/closed, not a
directional glyph, so there's nothing to mirror.

## Not yet built

- Real API/data-layer integration — **done, see "API wiring" below.**
- RTL was verified by code-review against every component (see above), not in
  a live browser — do a visual pass with `dir="rtl"` once this is running in
  the real app, particularly the score-input row and the live toggle switch.

## Admin panel — what's covered and what isn't

`AdminProfilePage` (spec §6.11) covers all eight admin bullets from the spec,
plus the team-alias review queue from §4.1 as a natural companion to the two
scraper panels:

| Panel | Spec ref | Tier gating |
|---|---|---|
| `MatchesStatisticsPanel` | §2.1, §6.11 | Top Tier only |
| `LiveScoreApiPanel` | §2.3, §6.11 | Top Tier only |
| `UnmatchedTeamsPanel` | §4.1 | Top Tier only (grouped under Data Sources) |
| `ManualMatchEntryPanel` | §2.4, §6.11 | Both tiers |
| `SelectedMatchesPanel` | §6.11 | Both tiers |
| `TeamCrestPanel` | §2.4, §6.11 | Both — Low Tier limited to crest-less teams |
| `ArenaManagementPanel` | §9, §6.11 | Both — bulk import is Top Tier only |
| `LeagueManagementPanel` | §6.11, §7.6 | Both — Low Tier sees only leagues they created (filter `leagues` before passing in) |
| `StringEditorPanel` | §1, §6.11 | Top Tier only |
| `ProxyPredictionPanel` | §6.9, §6.11 | Top Tier only |

`ProfilePage` covers all seven regular-user bullets — notably
`RankComparisonChart` is a **dependency-free inline SVG line chart**, not
wired to a charting library, since the project's stack (spec §1: Node.js +
React, no charting library specified) shouldn't gain a new dependency without
that being a deliberate choice made during implementation.

**Known gaps, deliberately left out of this pass:**
- Sign In / Join / Password Recovery pages — **done, see below.**
- The match-picker (which matches enter a league's pool) — **done, see below.**
- Knockout three-way result editing + match deletion — **done, see below.**

## Gap pass #2 — what got added

### Match-pool picker + result editing (spec §6.11, §9)
- `MatchPoolPickerPanel` — the picker half that `SelectedMatchesPanel` (review/
  unpublish) was always missing. League + week selectors, a searchable
  candidate list, multi-select, publish. Matches already in a league's pool
  show disabled with an "In pool" tag rather than being hidden, so admin
  isn't guessing what's already there.
- `MatchResultEditPanel` — manual result correction, available regardless of
  match status per spec. Ordinary matches get one score-pair; knockout
  matches (`match.isKnockout`) get three independent score-pairs (normal
  time / extra time / penalties), with extra time and penalties left blank
  when the tie didn't go there. Also carries the "delete a match, even after
  publication or finished" action, with an inline confirm step rather than a
  native `confirm()` dialog.
- Both are wired into `AdminProfilePage`'s "Matches" group alongside the
  existing `ManualMatchEntryPanel` and `SelectedMatchesPanel`.

### Sign In / Join / Password Recovery (spec §6.2–§6.4)
- `SignInPage`, `JoinPage`, `PasswordRecoveryPage` — one shared `AuthShell`
  layout, each with the exact fields the spec lists (Join's Invitation Code/
  Telegram ID/Email are genuinely optional, only Username+Password gate the
  submit button).
- `Captcha` — a **visual placeholder only**. Real captcha needs a server-side
  verify step and a provider site key, neither of which belongs in a
  component library; swap it for hCaptcha/Turnstile/reCAPTCHA later, keeping
  the same `onVerify(boolean)` contract so the three auth pages don't change.
- `PasswordRecoveryPage` intentionally has no "reset link" flow — per spec,
  a valid username generates a password that's sent to **Admin**, who
  manually relays it. The component just renders whichever `result` prop
  it's given ('sent' | 'invalid-username'); the actual check is a backend
  concern.
- `StayInMainLeaguePrompt` — the "also remain in Main League?" choice the
  spec calls out for code-based joins. Shown once, right after a successful
  code join; a no-code join skips it entirely (auto-added to Main League,
  no choice involved).
- `TopBar` / `TabBar` now follow the spec's exact visibility rules: **Profile**
  shown only when signed in, **Sign In** shown only when signed out, **Join**
  always visible. `App.jsx` demonstrates the full loop (sign in, sign out,
  join with/without a code) with a `signedIn` boolean — swap that for real
  auth state.

## Still not built
- Real email/SMS delivery, real captcha verification, real session/auth
  state — everything above is UI-complete but backend-agnostic by design.

## Gap pass #3 — the match-edit entry point

The previous pass left one thing explicitly flagged: `MatchResultEditPanel`
worked, but nothing let admin actually reach a *specific* match with it —
`App.jsx` just rendered two static examples side by side.

- `MatchResultsBrowser` — a searchable list of matches (status tag,
  knockout tag, competition) that opens `MatchResultEditPanel` for whichever
  one is clicked, with a "Back to list" step to return. This is now what's
  wired into `AdminProfilePage`'s Matches group instead of the raw two-item
  `.map()`.
- `src/mock/adminData.js`'s `resultEditableMatches` replaced the old
  `resultEditExamples` — six matches spanning finished/live/scheduled status
  and both league and knockout types, so the browser has something real to
  filter through.

## Gap pass #4 — real API wiring

There was no backend contract to build against — spec §1 only commits to a
stack ("Node.js backend, React frontend, SQLite via better-sqlite3"), not
endpoints. `API_CONTRACT.md` is that missing contract, and `src/api/*.js` is
built against it exactly.

### Architecture
- `src/api/client.js` — the only place that calls `fetch` directly.
  `request()` for JSON, `upload()` for multipart (crests, arena imports,
  MatchesStatistics file uploads). Throws `ApiError` with `.status/.code/.message`
  on any non-2xx response.
- `src/api/mockMode.js` — `USE_MOCK` is `true` whenever `VITE_API_BASE_URL`
  isn't set. Every function in every `src/api/*.js` module checks it and
  resolves from `src/mock/*.js` instead of calling the real backend. This is
  **why the app still runs today** with no backend at all — flip the env var
  once one exists, and nothing else changes.
- One `src/api/*.js` module per domain (`home`, `live`, `leagues`, `matches`,
  `predictions`, `profile`, `admin`, `auth`) — each function's real-mode branch
  maps the backend's JSON response into the *exact* shape the relevant
  component already expects, so the adaptation work happens once, here, not
  scattered across components.
- `src/hooks/useAsync.js` — the one data-fetching primitive, deliberately
  dependency-free (no react-query/SWR), matching the project's existing
  zero-extra-install choices (see `RankComparisonChart`'s inline-SVG chart for
  the same reasoning). Returns `{data, loading, error, refetch}` and guards
  against race conditions when params change quickly.
- `src/context/AuthContext.jsx` — session state, wraps `api/auth.js`, persists
  the token in `localStorage`, restores a session on load via `/auth/me`.
- `src/containers/` — one container per page. **This is the actual "wiring"**:
  each container calls the relevant `api/*.js` functions via `useAsync`,
  renders `LoadingState`/`ErrorState` (`src/components/ui/AsyncStates.jsx`)
  while in flight or on failure, and passes plain data + callback props into
  the *unchanged* presentational page component underneath. No page or
  component in `src/pages/` or `src/components/` was modified to know an API
  exists — that separation was already the design (see "router-agnostic" at
  the top of this file), this pass just proves it holds.
- `App.jsx` is now genuinely thin: navigation state, `AuthProvider`, and
  rendering the right container for the current `view`. It no longer imports
  any mock data directly.

### Known limitations in this pass
- **Two components manage selection state internally that their container
  can't see**, so those containers can't react to it:
  - `LeaguesPageContainer` — `LeaguesPage` has no real league-picker UI yet
    (spec §6.5 wants a dropdown; the component only exposes an
    `onOpenLeagueSelect` callback with nothing to attach a picker to). The
    container works around this by cycling to the next competition in the
    list on click. Not real UX, good enough to prove the data flow.
  - `AdminProfilePageContainer` — `MatchResultsBrowser`'s search box is
    local state; the container always fetches `searchMatches('')` (everything)
    and search happens client-side within that result set.
  - `MatchPoolPickerPanel` was the one exception fixed *during* this pass
    rather than left as a limitation: it now accepts optional
    `leagueId`/`weekId`/`onLeagueChange`/`onWeekChange` props, controlled from
    outside when supplied and falling back to internal state otherwise — so
    `AdminProfilePageContainer` can actually refetch candidates when the
    selection changes, and the component still works standalone with a static
    `candidates` list if nothing controls it.
- `UnmatchedTeamsPanel`'s "Link as Alias" button has no team-picker UI (calls
  `onLinkAlias(item)` with no `teamId`) — `AdminProfilePageContainer`'s
  handler reads `item.suggestedTeamId`, which nothing currently sets. Real
  alias-linking needs a team search/picker added to that panel first.
- Mock mode's `getMe()` always resolves to signed-out on load (by design —
  there's no session to restore without a backend), so reaching Profile/Admin
  in the running demo requires going through Sign In first. Any non-empty
  username+password signs in in mock mode.
- `onManageMembers` (League Management) and viewing an archived league's
  leaderboard (`onViewPreviousLeague`) are still `console.log` stubs — neither
  has a corresponding panel/page built yet, so there's nothing for the API
  call to hand data to.
