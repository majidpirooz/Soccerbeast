// Mock data shaped after the entity dictionary in soccer-beast-spec.md §3.
// Swap this module for real API calls once the backend endpoints exist —
// every component in this library takes plain props, not this shape directly,
// so wiring real data just means mapping API responses into these same shapes.

export const teams = {
  mci: { id: 'mci', name: 'Man City', short: 'MC', crest: null },
  che: { id: 'che', name: 'Chelsea', short: 'CH', crest: null },
  ars: { id: 'ars', name: 'Arsenal', short: 'AR', crest: null },
  liv: { id: 'liv', name: 'Liverpool', short: 'LP', crest: null },
  nap: { id: 'nap', name: 'Napoli', short: 'NP', crest: null },
  tot: { id: 'tot', name: 'Tottenham', short: 'TO', crest: null },
  eve: { id: 'eve', name: 'Everton', short: 'EV', crest: null },
};

export const nextMatch = {
  id: 'm-201',
  competition: { name: 'Champions League', round: 'Matchday 3' },
  home: teams.liv,
  away: teams.nap,
  kickoff: '2026-08-12T20:00:00Z',
  kickoffLabel: 'Tue 20:00',
  status: 'open', // open | locked | live | finished
  predictionSplit: { home: 44, draw: 22, away: 34 },
};

export const liveMatch = {
  id: 'm-198',
  competition: { name: 'Premier League' },
  home: teams.tot,
  away: teams.eve,
  homeScore: 1,
  awayScore: 1,
  minute: "67'",
  status: 'live',
  highlighted: true,
  events: [
    { id: 'e1', minute: "23'", type: 'goal', text: 'Son (Tottenham)' },
    { id: 'e2', minute: "40'", type: 'yellow', text: 'Doucouré (Everton)' },
    { id: 'e3', minute: "58'", type: 'goal', text: 'Calvert-Lewin (Everton)' },
    { id: 'e4', minute: "61'", type: 'sub', text: 'Richarlison ↔ Bentancur' },
  ],
};

export const standingsRows = [
  { rank: 1, change: 'up', team: teams.mci, p: 11, w: 8, d: 2, l: 1, gf: 27, ga: 11, pts: 26, form: ['w', 'd', 'l', 'w', 'w'] },
  { rank: 2, change: 'down', team: teams.ars, p: 11, w: 7, d: 2, l: 2, gf: 22, ga: 10, pts: 23, form: ['w', 'w', 'l', 'w', 'd'] },
  { rank: 3, change: 'same', team: teams.liv, p: 11, w: 7, d: 1, l: 3, gf: 21, ga: 13, pts: 22, form: ['l', 'w', 'w', 'd', 'w'] },
];

export const fixtureWeeks = [
  {
    id: 'w12',
    label: 'Week 12 · Current',
    open: true,
    fixtures: [
      { id: 'f1', time: '17:30', home: teams.mci, away: teams.che, score: 'VS' },
      { id: 'f2', time: '20:00', home: teams.ars, away: teams.tot, score: 'VS' },
    ],
  },
  {
    id: 'w13',
    label: 'Week 13',
    open: false,
    fixtures: [{ id: 'f3', time: '15:00', home: teams.liv, away: teams.eve, score: 'VS' }],
  },
];

export const leaderboardRows = [
  { rank: 1, change: 'up', user: { id: 'u1', name: 'Majid', initials: 'MJ' }, exact: 9, pts: 142, trophies: { gold: true, diamond: true } },
  { rank: 2, change: 'same', user: { id: 'u2', name: 'Sara', initials: 'SA' }, exact: 6, pts: 128, trophies: { gold: false, diamond: true } },
  { rank: 3, change: 'down', user: { id: 'u3', name: 'Reza', initials: 'RE' }, exact: 5, pts: 119, trophies: { gold: false, diamond: false } },
];

export const matchDetail = {
  id: 'm-190',
  competition: { name: 'Champions League', round: 'Group Stage' },
  venue: 'Anfield',
  referee: 'A. Taylor',
  status: 'finished',
  home: teams.liv,
  away: teams.nap,
  homeScore: 2,
  awayScore: 1,
  events: [
    { id: 't1', minute: "12'", type: 'goal', title: 'Salah scores', sub: 'Assist: Alexander-Arnold' },
    { id: 't2', minute: "35'", type: 'yellow', title: 'Yellow card — Van Dijk' },
    { id: 't3', minute: "58'", type: 'goal', title: 'Osimhen scores', sub: 'Assist: Kvaratskhelia' },
    { id: 't4', minute: "71'", type: 'sub', title: 'Núñez ↔ Gakpo' },
    { id: 't5', minute: "84'", type: 'goal', title: 'Gakpo scores', sub: 'Assist: Salah' },
  ],
  lineups: {
    home: { formation: '4-3-3', coach: 'A. Slot', players: [
      { num: 1, name: 'Alisson' },
      { num: 66, name: 'Alexander-Arnold' },
      { num: 4, name: 'Van Dijk' },
      { num: 11, name: 'Salah' },
    ]},
    away: { formation: '4-2-3-1', coach: 'A. Conte', players: [
      { num: 1, name: 'Meret' },
      { num: 4, name: 'Rrahmani' },
      { num: 77, name: 'Kvaratskhelia' },
      { num: 9, name: 'Osimhen' },
    ]},
  },
  stats: [
    { label: 'Possession', home: 58, away: 42, unit: '%' },
    { label: 'Total Shots', home: 14, away: 9 },
    { label: 'Fouls', home: 7, away: 11 },
  ],
};
