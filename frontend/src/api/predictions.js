import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { leaderboardRows, nextMatch, liveMatch } from '../mock/data';

const MOCK_MY_LEAGUES = [
  { id: 'main', name: 'Main League' },
  { id: 'office', name: 'Office Fantasy' },
];

/** getMyPredictionLeagues — the league-tabs list on PredictionPage. */
export async function getMyPredictionLeagues() {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_MY_LEAGUES;
  }
  return request('/prediction-leagues');
}

export async function getLeaderboard(leagueId) {
  if (USE_MOCK) {
    await mockDelay();
    return { rows: leaderboardRows };
  }
  return request(`/prediction-leagues/${leagueId}/leaderboard`);
}

export async function getMatchesToPredict(leagueId) {
  if (USE_MOCK) {
    await mockDelay();
    return [
      { match: nextMatch, mode: 'normal', initial: { home: 2, away: 1 } },
      {
        match: liveMatch,
        mode: 'combined',
        initial: { home: 2, away: 2 },
        initial2: { home: 3, away: 1 },
        enteredByAdmin: true,
      },
    ];
  }
  return request(`/prediction-leagues/${leagueId}/matches-to-predict`);
}

/** submitPrediction — `picks` has 1 entry for Normal mode, 2 for Combined (spec §7.4). */
export async function submitPrediction({ leagueId, matchId, picks }) {
  if (USE_MOCK) {
    await mockDelay();
    return null;
  }
  return request('/predictions', { method: 'POST', body: { leagueId, matchId, picks } });
}
