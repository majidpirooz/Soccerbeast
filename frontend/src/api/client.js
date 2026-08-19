// client.js — the one place that knows how to talk to the real backend.
// Every function in src/api/*.js goes through `request()` (or `upload()`
// for file uploads) rather than calling `fetch` directly, so auth headers,
// error shapes, and the base URL all stay in one place.

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';

let authToken = null;

/** setAuthToken — called by AuthContext after sign in/join, and with `null` on sign out. */
export function setAuthToken(token) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseResponse(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * request — JSON request helper. `path` is relative to BASE_URL (e.g.
 * '/live?date=2026-08-14'). Throws ApiError on any non-2xx response.
 */
export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseResponse(res);
  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError(res.status, err.code || 'unknown_error', err.message || res.statusText);
  }
  return data;
}

/**
 * upload — multipart/form-data helper for file uploads (crests, arena
 * imports, MatchesStatistics offline HTML / online workbook uploads).
 * `fields` is a plain object of extra form fields alongside `file`.
 */
export async function upload(path, file, fields = {}) {
  const form = new FormData();
  if (file) form.append('file', file);
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: form,
  });

  const data = await parseResponse(res);
  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError(res.status, err.code || 'unknown_error', err.message || res.statusText);
  }
  return data;
}
