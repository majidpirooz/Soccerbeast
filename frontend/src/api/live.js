import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { liveMatch } from '../mock/data';

const MOCK_DAYS = [
  { id: 'd-2', label: 'Wed 3 Aug', sublabel: 'Day before' },
  { id: 'd-1', label: 'Thu 4 Aug', sublabel: 'Yesterday' },
  { id: 'today', label: 'Fri 5 Aug', sublabel: 'Today' },
  { id: 'd+1', label: 'Sat 6 Aug', sublabel: 'Tomorrow' },
  { id: 'd+2', label: 'Sun 7 Aug', sublabel: 'Day after' },
];

/** getLive — spec §6.7. `date` is a day id from the returned `days` list (or an ISO date once wired to a real backend). */
export async function getLive(date) {
  if (USE_MOCK) {
    await mockDelay();
    return {
      days: MOCK_DAYS,
      leagueGroups: [{ id: 'pl', name: 'Premier League', matches: [liveMatch] }],
      lastUpdate: '21:47:03',
      highlightedMatchIds: [liveMatch.id],
    };
  }
  return request(`/live?date=${encodeURIComponent(date)}`);
}
