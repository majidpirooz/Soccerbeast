import { config } from '../config.js';
import { ApiError } from '../lib/errors.js';

/**
 * liveScoreRequest — every call to vendor-livescore-api goes through here.
 * Per that service's own README: "Your website's backend (not the browser)
 * should hold the X-API-Key and call this API server-to-server" — this
 * module is that boundary; nothing outside src/services/ or src/routes/
 * ever sees LIVESCORE_API_KEY.
 */
async function liveScoreRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${config.liveScoreApiBaseUrl}${path}`, {
    method,
    headers: {
      'X-API-Key': config.liveScoreApiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(
      res.status === 401 ? 502 : res.status, // our own API key misconfigured is our bug, not the caller's
      'livescore_api_error',
      `livescore-api ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

export const liveScoreClient = {
  start: (intervalSeconds, recheckSeconds) =>
    liveScoreRequest('/control/start', { method: 'POST', body: { interval_seconds: intervalSeconds, recheck_seconds: recheckSeconds } }),
  stop: () => liveScoreRequest('/control/stop', { method: 'POST' }),
  status: () => liveScoreRequest('/control/status'),
  updateConfig: (intervalSeconds, recheckSeconds) =>
    liveScoreRequest('/control/config', { method: 'PUT', body: { interval_seconds: intervalSeconds, recheck_seconds: recheckSeconds } }),
  listMatches: (liveOnly = false) => liveScoreRequest(`/matches?live_only=${liveOnly}`),
  getMatch: (matchId) => liveScoreRequest(`/matches/${matchId}`),
  latestSnapshot: () => liveScoreRequest('/snapshots/latest'),
};
