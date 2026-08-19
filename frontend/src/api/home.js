import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { liveMatch, nextMatch, teams, matchDetail } from '../mock/data';

/** getHome — spec §6.1: hero slide, mini-row, Next Match, Latest Matches. */
export async function getHome() {
  if (USE_MOCK) {
    await mockDelay();
    return {
      heroMatch: {
        ...liveMatch,
        dateLabel: 'SAT 10 AUG · 20:30 · OLD TRAFFORD',
        home: teams.mci,
        away: teams.che,
        homeScore: 2,
        awayScore: 1,
      },
      miniMatches: [liveMatch],
      nextMatch,
      latestMatches: [matchDetail],
    };
  }
  return request('/home');
}
