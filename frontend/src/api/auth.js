import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { currentUser } from '../mock/profileData';

/**
 * signIn — spec §6.2. On success returns { token, user }; on failure the
 * caller catches ApiError and shows its `.message`.
 */
export async function signIn({ username, password }) {
  if (USE_MOCK) {
    await mockDelay();
    if (!username || !password) throw mockAuthError('missing_credentials', 'Username and password are required.');
    return { token: 'mock-token', user: currentUser };
  }
  return request('/auth/signin', { method: 'POST', body: { username, password } });
}

/**
 * join — spec §6.4. `joinedLeague` in the response is present only when
 * an invitation code was supplied and valid — the caller uses that to
 * decide whether to show the "stay in Main League too?" prompt.
 */
export async function join(form) {
  if (USE_MOCK) {
    await mockDelay();
    const joinedLeague = form.invitationCode ? { id: 'office', name: 'Office Fantasy' } : undefined;
    return { token: 'mock-token', user: currentUser, joinedLeague };
  }
  return request('/auth/join', { method: 'POST', body: form });
}

/** recoverPassword — spec §6.3. Never returns the password itself; it's relayed to the user via Admin. */
export async function recoverPassword(username) {
  if (USE_MOCK) {
    await mockDelay();
    return { result: username.trim() ? 'sent' : 'invalid-username' };
  }
  return request('/auth/recover', { method: 'POST', body: { username } });
}

/** getMe — restores a session from a stored token on app load. Returns null if not signed in. */
export async function getMe() {
  if (USE_MOCK) {
    await mockDelay(80);
    return null; // mock mode starts signed-out; App.jsx's demo controls drive sign-in
  }
  try {
    const { user } = await request('/auth/me');
    return user;
  } catch {
    return null;
  }
}

export async function signOut() {
  if (USE_MOCK) return mockDelay(80);
  return request('/auth/signout', { method: 'POST' });
}

function mockAuthError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
