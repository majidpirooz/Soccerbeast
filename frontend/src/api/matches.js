import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { matchDetail } from '../mock/data';

/** getMatch — spec §6.8. Returns the full match-page shape (events, lineups, stats). */
export async function getMatch(matchId) {
  if (USE_MOCK) {
    await mockDelay();
    return { ...matchDetail, id: matchId };
  }
  return request(`/matches/${matchId}`);
}
