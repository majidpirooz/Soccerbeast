import { verifyToken } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { db } from '../db/index.js';

/** requireAuth — validates the Bearer token and attaches req.user (fresh from DB, not just the token payload). */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'missing_token', 'Sign in required.');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'invalid_token', 'Session expired or invalid — please sign in again.');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!user) throw new ApiError(401, 'invalid_token', 'Account no longer exists.');

  req.user = user;
  next();
}

/** requireAdminTier — spec §7.6 tier gating. `minTier` is 'admin_low' (either admin tier ok) or 'admin_top'. */
export function requireAdminTier(minTier = 'admin_low') {
  return (req, res, next) => {
    const tier = req.user?.tier;
    const ok = minTier === 'admin_top' ? tier === 'admin_top' : tier === 'admin_top' || tier === 'admin_low';
    if (!ok) throw new ApiError(403, 'forbidden', 'Admin access required.');
    next();
  };
}
