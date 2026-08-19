import { request, upload } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import {
  scraperStatus,
  unmatchedTeamNames,
  arenas,
  predictionLeaguesAdmin,
  selectedMatchesQueue,
  matchPoolCandidates,
  weeksForPicker,
  resultEditableMatches,
  uiStrings,
  proxyPredictionLog,
  allUsersForProxy,
  manualCompetitions,
} from '../mock/adminData';
import { teams } from '../mock/data';

// ---- Data sources (Top Tier only) ----

export async function getScraperStatus() {
  if (USE_MOCK) {
    await mockDelay();
    return scraperStatus;
  }
  return request('/admin/scraper-status');
}

export async function runMatchesStatisticsNow() {
  if (USE_MOCK) return mockDelay();
  return request('/admin/matches-statistics/run', { method: 'POST' });
}

export async function saveMatchesStatisticsSchedule(payload) {
  if (USE_MOCK) return mockDelay();
  return request('/admin/matches-statistics/schedule', { method: 'PATCH', body: payload });
}

export async function uploadMatchesStatisticsFile(file, mode) {
  if (USE_MOCK) return mockDelay();
  return upload('/admin/matches-statistics/upload', file, { mode });
}

export async function saveLiveScoreSchedule(payload) {
  if (USE_MOCK) return mockDelay();
  return request('/admin/live-score-api/schedule', { method: 'PATCH', body: payload });
}

export async function forceStartLiveScore() {
  if (USE_MOCK) return mockDelay();
  return request('/admin/live-score-api/start', { method: 'POST' });
}

export async function forceStopLiveScore() {
  if (USE_MOCK) return mockDelay();
  return request('/admin/live-score-api/stop', { method: 'POST' });
}

export async function getUnmatchedTeams() {
  if (USE_MOCK) {
    await mockDelay();
    return unmatchedTeamNames;
  }
  return request('/admin/unmatched-teams');
}

export async function linkAlias(itemId, teamId) {
  if (USE_MOCK) return mockDelay();
  return request(`/admin/unmatched-teams/${itemId}/link-alias`, { method: 'POST', body: { teamId } });
}

export async function createTeamFromUnmatched(itemId, name) {
  if (USE_MOCK) return mockDelay();
  return request(`/admin/unmatched-teams/${itemId}/create-team`, { method: 'POST', body: { name } });
}

// ---- Matches ----

export async function submitManualMatch(form) {
  if (USE_MOCK) return mockDelay();
  return request('/admin/matches', { method: 'POST', body: form });
}

export async function getMatchPoolCandidates(leagueId, weekId) {
  if (USE_MOCK) {
    await mockDelay();
    return matchPoolCandidates;
  }
  return request(`/admin/match-pool-candidates?leagueId=${leagueId}&weekId=${weekId}`);
}

export async function getMatchPoolWeeks() {
  if (USE_MOCK) {
    await mockDelay();
    return weeksForPicker;
  }
  return request('/admin/match-pool-weeks');
}

export async function getManualEntryCompetitions() {
  if (USE_MOCK) {
    await mockDelay();
    return manualCompetitions;
  }
  return request('/admin/competition-types');
}

export async function publishToPool(payload) {
  if (USE_MOCK) return mockDelay();
  return request('/admin/match-pool', { method: 'POST', body: payload });
}

export async function getSelectedMatches() {
  if (USE_MOCK) {
    await mockDelay();
    return selectedMatchesQueue;
  }
  return request('/admin/selected-matches');
}

export async function unpublishMatch(itemId) {
  if (USE_MOCK) return mockDelay();
  return request(`/admin/selected-matches/${itemId}/unpublish`, { method: 'POST' });
}

export async function searchMatches(query) {
  if (USE_MOCK) {
    await mockDelay();
    return resultEditableMatches.filter((m) =>
      `${m.home.name} ${m.away.name} ${m.competition?.name}`.toLowerCase().includes((query || '').toLowerCase())
    );
  }
  return request(`/admin/matches?query=${encodeURIComponent(query || '')}`);
}

export async function saveMatchResult(matchId, result) {
  if (USE_MOCK) return mockDelay();
  return request(`/admin/matches/${matchId}/result`, { method: 'PATCH', body: result });
}

export async function deleteMatch(matchId) {
  if (USE_MOCK) return mockDelay();
  return request(`/admin/matches/${matchId}`, { method: 'DELETE' });
}

// ---- Teams & Arenas ----

export async function getAdminTeams() {
  if (USE_MOCK) {
    await mockDelay();
    return Object.values(teams);
  }
  return request('/admin/teams');
}

export async function saveCrest(teamId, { file, url }) {
  if (USE_MOCK) return mockDelay();
  if (file) return upload(`/admin/teams/${teamId}/crest`, file);
  return request(`/admin/teams/${teamId}/crest`, { method: 'POST', body: { url } });
}

export async function getArenas() {
  if (USE_MOCK) {
    await mockDelay();
    return arenas;
  }
  return request('/admin/arenas');
}

export async function importArenas(file) {
  if (USE_MOCK) return mockDelay();
  return upload('/admin/arenas/import', file);
}

export async function addArena(teamId, arena) {
  if (USE_MOCK) return mockDelay();
  return request(`/admin/arenas/${teamId}`, { method: 'POST', body: { arena } });
}

// ---- Leagues ----

export async function getAdminLeagues() {
  if (USE_MOCK) {
    await mockDelay();
    return predictionLeaguesAdmin;
  }
  return request('/admin/leagues');
}

export async function createAdminLeague(name) {
  if (USE_MOCK) return mockDelay();
  return request('/admin/leagues', { method: 'POST', body: { name } });
}

export async function finishLeague(leagueId) {
  if (USE_MOCK) return mockDelay();
  return request(`/admin/leagues/${leagueId}/finish`, { method: 'POST' });
}

export async function regenerateLeagueCode(leagueId) {
  if (USE_MOCK) {
    await mockDelay();
    return { code: Math.random().toString(36).slice(2, 10).toUpperCase() };
  }
  return request(`/admin/leagues/${leagueId}/regenerate-code`, { method: 'POST' });
}

// ---- Content (Top Tier only) ----

export async function getUiStrings() {
  if (USE_MOCK) {
    await mockDelay();
    return uiStrings;
  }
  return request('/admin/strings');
}

export async function saveUiStrings(edits) {
  if (USE_MOCK) return mockDelay();
  return request('/admin/strings', { method: 'PATCH', body: edits });
}

// ---- Predictions (Top Tier only) ----

export async function getProxyUsers() {
  if (USE_MOCK) {
    await mockDelay();
    return allUsersForProxy;
  }
  return request('/users');
}

export async function getProxyPredictionLog() {
  if (USE_MOCK) {
    await mockDelay();
    return proxyPredictionLog;
  }
  return request('/admin/proxy-predictions/log');
}

export async function submitProxyPrediction({ userId, matchId, home, away }) {
  if (USE_MOCK) return mockDelay();
  return request('/admin/proxy-predictions', { method: 'POST', body: { userId, matchId, home, away } });
}
