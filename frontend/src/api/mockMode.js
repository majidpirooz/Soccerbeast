// mockMode.js — every src/api/*.js module checks USE_MOCK and, if true,
// resolves with data from src/mock/*.js instead of calling the real
// backend. This is how the component library keeps working today (no
// backend exists yet) while every call site is already written against
// the real contract in API_CONTRACT.md — flipping USE_MOCK to false
// (by setting VITE_API_BASE_URL) is the only change needed once a real
// backend exists, nothing in components/pages/hooks changes.

export const USE_MOCK = !(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL);

/** mockDelay — small artificial latency so loading states are visible/testable in mock mode. */
export function mockDelay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
