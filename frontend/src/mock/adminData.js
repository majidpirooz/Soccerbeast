// Mock data for the admin panel (spec §2, §6.11). Same rule as mock/data.js —
// swap for real API calls, keep the same shapes.

import { STRING_ENTRIES } from './stringsData.js';

export const scraperStatus = {
  matchesStatistics: {
    mode: 'online', // 'offline' | 'online'
    lastRun: '2026-08-13 00:04',
    lastResult: 'success',
    scheduled: true,
    scheduleCron: '0 0 * * *',
  },
  liveScoreApi: {
    running: true,
    dailyStartTime: '00:00',
    preMatchLeadMinutes: 15,
    postMatchLingerMinutes: 10,
    pollIntervalSeconds: 30,
    lastTick: '2026-08-13 21:47:03',
  },
};

export const unmatchedTeamNames = [
  { id: 'u1', source: 'livescore-api', rawText: 'پرسپولیس', language: 'fa', seenAt: '2026-08-13 00:04' },
  { id: 'u2', source: 'football-data.org', rawText: 'Parma Calcio 1913', language: 'en', seenAt: '2026-08-12 06:00' },
];

export const arenas = [
  { id: 'a1', team: 'Man City', arenas: ['Etihad Stadium'] },
  { id: 'a2', team: 'Liverpool', arenas: ['Anfield'] },
  { id: 'a3', team: 'Real Madrid', arenas: ['Santiago Bernabéu', 'Estadio Alfredo Di Stéfano'] },
];

export const manualCompetitions = [
  { id: 'c1', name: 'FA Cup', type: 'knockout' },
  { id: 'c2', name: 'Champions League', type: 'group+knockout' },
  { id: 'c3', name: 'International Friendly', type: 'friendly' },
];

export const predictionLeaguesAdmin = [
  { id: 'main', name: 'Main League', tier: 'top', members: 34, matchPool: 'own', code: 'MB7K2P9Q', status: 'active' },
  { id: 'office', name: 'Office Fantasy', tier: 'low', members: 12, matchPool: 'shared-main', code: 'X4T9RW2L', status: 'active' },
  { id: 'legends', name: 'Sunday Legends 2025-26', tier: 'low', members: 8, matchPool: 'own', code: 'Z1Q8MN4D', status: 'archived' },
];

export const selectedMatchesQueue = [
  { id: 'sm1', match: 'Liverpool vs Napoli', week: 'Week 12', league: 'main', published: true },
  { id: 'sm2', match: 'Man City vs Chelsea', week: 'Week 12', league: 'main', published: true },
  { id: 'sm3', match: 'Arsenal vs Tottenham', week: 'Week 13', league: 'office', published: false },
];

// StringEditorPanel's demo data -- derived from the same source as the
// live translations (stringsData.js) so the admin demo never drifts out of
// sync with what's actually rendered. Only a slice shown here (the panel's
// own search box handles browsing the rest in a real deployment).
export const uiStrings = STRING_ENTRIES.slice(0, 12).map(([key, en, fa], i) => ({ id: `s${i + 1}`, key, en, fa }));

export const proxyPredictionLog = [
  { id: 'pp1', user: 'Reza', match: 'Man City vs Chelsea', pick: '2-1', enteredBy: 'admin (Majid)', at: '2026-08-11 09:14' },
];

export const allUsersForProxy = [
  { id: 'u1', name: 'Majid' },
  { id: 'u2', name: 'Sara' },
  { id: 'u3', name: 'Reza' },
];

// Match-pool picker candidates — matches already fixtured (via
// MatchesStatistics / manual entry) but not yet published to every
// league's prediction pool. `inPool` reflects whether the currently
// selected league already has it.
export const matchPoolCandidates = [
  {
    id: 'mp1',
    home: { id: 'mci', name: 'Man City', short: 'MC' },
    away: { id: 'che', name: 'Chelsea', short: 'CH' },
    competition: { name: 'Premier League' },
    kickoffLabel: 'Sat 17:30',
    inPool: true,
  },
  {
    id: 'mp2',
    home: { id: 'ars', name: 'Arsenal', short: 'AR' },
    away: { id: 'tot', name: 'Tottenham', short: 'TO' },
    competition: { name: 'Premier League' },
    kickoffLabel: 'Sat 20:00',
    inPool: false,
  },
  {
    id: 'mp3',
    home: { id: 'liv', name: 'Liverpool', short: 'LP' },
    away: { id: 'nap', name: 'Napoli', short: 'NP' },
    competition: { name: 'Champions League' },
    kickoffLabel: 'Tue 20:00',
    inPool: false,
  },
];

export const weeksForPicker = [
  { id: 'w12', label: 'Week 12' },
  { id: 'w13', label: 'Week 13' },
];

// A broader match list for MatchResultsBrowser — spans finished/live/
// scheduled statuses and both league and knockout matches, so the browser
// has something real to search/filter/click through instead of two static
// examples sitting side by side.
export const resultEditableMatches = [
  {
    id: 'rm1',
    isKnockout: false,
    status: 'finished',
    competition: { name: 'Serie A' },
    home: { id: 'int', name: 'Inter', short: 'IN' },
    away: { id: 'rom', name: 'Roma', short: 'RO' },
    result: { normalTime: { home: 2, away: 0 } },
  },
  {
    id: 'rm2',
    isKnockout: true,
    status: 'finished',
    competition: { name: 'Champions League · QF 2nd Leg' },
    home: { id: 'rma', name: 'Real Madrid', short: 'RM' },
    away: { id: 'bay', name: 'Bayern', short: 'BA' },
    result: {
      normalTime: { home: 1, away: 1 },
      extraTime: { home: 1, away: 1 },
      penalties: { home: 5, away: 4 },
    },
  },
  {
    id: 'rm3',
    isKnockout: false,
    status: 'live',
    competition: { name: 'Premier League' },
    home: { id: 'tot', name: 'Tottenham', short: 'TO' },
    away: { id: 'eve', name: 'Everton', short: 'EV' },
    result: { normalTime: { home: 1, away: 1 } },
  },
  {
    id: 'rm4',
    isKnockout: false,
    status: 'scheduled',
    competition: { name: 'La Liga' },
    home: { id: 'sev', name: 'Sevilla', short: 'SE' },
    away: { id: 'val', name: 'Valencia', short: 'VA' },
    result: { normalTime: { home: '', away: '' } },
  },
  {
    id: 'rm5',
    isKnockout: true,
    status: 'finished',
    competition: { name: 'FA Cup · Round of 16' },
    home: { id: 'mci', name: 'Man City', short: 'MC' },
    away: { id: 'che', name: 'Chelsea', short: 'CH' },
    result: {
      normalTime: { home: 2, away: 2 },
      extraTime: { home: '', away: '' },
      penalties: { home: '', away: '' },
    },
  },
  {
    id: 'rm6',
    isKnockout: false,
    status: 'finished',
    competition: { name: 'Bundesliga' },
    home: { id: 'bay2', name: 'Bayern', short: 'BA' },
    away: { id: 'rb', name: 'Leipzig', short: 'RB' },
    result: { normalTime: { home: 3, away: 1 } },
  },
];
