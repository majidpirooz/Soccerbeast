import { request, upload } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { currentUser, progress, comparisonSeries, allUsers, previousLeagues } from '../mock/profileData';

export async function getProfile() {
  if (USE_MOCK) {
    await mockDelay();
    return { user: currentUser, progress, mode: 'normal', lang: 'en', previousLeagues };
  }
  return request('/profile');
}

export async function saveAccount({ username, password }) {
  if (USE_MOCK) return mockDelay();
  return request('/profile/account', { method: 'PATCH', body: { username, password } });
}

export async function uploadAvatar(file) {
  if (USE_MOCK) {
    await mockDelay();
    return { avatarUrl: null };
  }
  return upload('/profile/avatar', file);
}

export async function savePreferences({ mode, lang }) {
  if (USE_MOCK) return mockDelay();
  return request('/profile/preferences', { method: 'PATCH', body: { mode, lang } });
}

export async function getComparison(userIds, metric = 'weeklyPoints') {
  if (USE_MOCK) {
    await mockDelay();
    return { series: comparisonSeries.filter((s) => userIds.includes(s.user.id)) };
  }
  return request(`/profile/compare?userIds=${userIds.join(',')}&metric=${metric}`);
}

export async function getAllUsers() {
  if (USE_MOCK) {
    await mockDelay();
    return allUsers;
  }
  return request('/users');
}

export async function createLeague(name) {
  if (USE_MOCK) {
    await mockDelay();
    return { league: { id: `l-${Date.now()}`, name } };
  }
  return request('/prediction-leagues', { method: 'POST', body: { name } });
}
