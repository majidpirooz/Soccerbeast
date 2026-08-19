import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { setAuthToken } from '../api/client';

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'soccerbeast_token';

/**
 * AuthProvider — wraps the whole app. Restores a session from a stored
 * token on load (`authApi.getMe`), and exposes signIn/join/recover/signOut
 * that every auth page + TopBar/TabBar's signed-in/out logic reads from.
 *
 * `role` is a *demo-only* concept for this component library (see
 * AdminProfilePage's `role` prop) — a real backend would return the
 * user's tier as part of `user` from `/auth/me`, not need a separate
 * switch. Kept here as local state so App.jsx doesn't have to.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (stored) setAuthToken(stored);
    authApi.getMe().then((u) => {
      setUser(u);
      setRestoring(false);
    });
  }, []);

  const persistToken = (token) => {
    setAuthToken(token);
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const signIn = useCallback(async (credentials) => {
    const { token, user } = await authApi.signIn(credentials);
    persistToken(token);
    setUser(user);
    return user;
  }, []);

  const join = useCallback(async (form) => {
    const { token, user, joinedLeague } = await authApi.join(form);
    persistToken(token);
    setUser(user);
    return { user, joinedLeague };
  }, []);

  const recoverPassword = useCallback((username) => authApi.recoverPassword(username), []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    persistToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, restoring, signIn, join, recoverPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
