import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { standingsRows, fixtureWeeks } from '../mock/data';

const MOCK_COMPETITIONS = [
  { id: 'pl', name: 'Premier League' },
  { id: 'laliga', name: 'La Liga' },
  { id: 'cl', name: 'Champions League' },
];

const MOCK_SEASONS = [
  { id: 's1', label: '2026-27' },
  { id: 's2', label: '2025-26' },
];

export async function getCompetitions() {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_COMPETITIONS;
  }
  return request('/competitions');
}

export async function getSeasons(competitionId) {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_SEASONS;
  }
  return request(`/competitions/${competitionId}/seasons`);
}

export async function getStandings(competitionId, seasonId) {
  if (USE_MOCK) {
    await mockDelay();
    return { rows: standingsRows };
  }
  return request(`/competitions/${competitionId}/standings?season=${seasonId}`);
}

export async function getFixtures(competitionId, seasonId) {
  if (USE_MOCK) {
    await mockDelay();
    return { weeks: fixtureWeeks };
  }
  return request(`/competitions/${competitionId}/fixtures?season=${seasonId}`);
}
