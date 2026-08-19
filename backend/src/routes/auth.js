import { Router } from 'express';
import { db } from '../db/index.js';
import { hashPassword, verifyPassword, signToken, generateStrongPassword } from '../lib/auth.js';
import { ApiError, asyncRoute } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

function publicUser(row) {
  return {
    id: row.id,
    name: row.username,
    initials: row.username.slice(0, 2).toUpperCase(),
    tier: row.tier,
  };
}

authRouter.post(
  '/auth/join',
  asyncRoute(async (req, res) => {
    const { username, password, invitationCode, telegramId, email } = req.body || {};
    if (!username || !password) {
      throw new ApiError(400, 'missing_fields', 'Username and password are required.');
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) throw new ApiError(409, 'username_taken', 'That username is already in use.');

    const insertUser = db.prepare(
      `INSERT INTO users (username, password_hash, telegram_id, email) VALUES (?, ?, ?, ?)`
    );
    const result = insertUser.run(username, hashPassword(password), telegramId || null, email || null);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Always a member of Main League (spec §6.4).
    const main = db.prepare('SELECT id FROM prediction_leagues WHERE is_main_league = 1').get();
    if (main) {
      db.prepare('INSERT OR IGNORE INTO league_memberships (league_id, user_id) VALUES (?, ?)').run(main.id, user.id);
    } else {
      // First-ever user: nothing to seed Main League with until now — do it here.
      db.prepare(
        `INSERT INTO prediction_leagues (name, created_by_user_id, is_main_league, season_label) VALUES ('Main League', ?, 1, 'current')`
      ).run(user.id);
      const newMain = db.prepare('SELECT id FROM prediction_leagues WHERE is_main_league = 1').get();
      db.prepare('INSERT INTO league_memberships (league_id, user_id) VALUES (?, ?)').run(newMain.id, user.id);
    }

    let joinedLeague;
    if (invitationCode) {
      const league = db.prepare('SELECT * FROM prediction_leagues WHERE invitation_code = ? AND status = ?')
        .get(invitationCode, 'active');
      if (!league) throw new ApiError(400, 'invalid_invitation_code', 'That invitation code is not valid.');
      db.prepare('INSERT OR IGNORE INTO league_memberships (league_id, user_id) VALUES (?, ?)').run(league.id, user.id);
      joinedLeague = { id: league.id, name: league.name };
    }

    res.status(201).json({ token: signToken(user), user: publicUser(user), joinedLeague });
  })
);

authRouter.post(
  '/auth/signin',
  asyncRoute(async (req, res) => {
    const { username, password } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username || '');
    if (!user || !verifyPassword(password || '', user.password_hash)) {
      throw new ApiError(401, 'invalid_credentials', 'Incorrect username or password.');
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

authRouter.post(
  '/auth/recover',
  asyncRoute(async (req, res) => {
    const { username } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username || '');
    if (!user) {
      // Spec doesn't say whether to reveal username existence; matching the
      // frontend's expected {result} shape either way, no user enumeration
      // beyond that single bit (already implied by "sent" vs "invalid").
      return res.json({ result: 'invalid-username' });
    }

    const newPassword = generateStrongPassword();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(hashPassword(newPassword), user.id);
    db.prepare(
      'INSERT INTO password_recovery_requests (user_id, generated_password) VALUES (?, ?)'
    ).run(user.id, newPassword);

    // Real delivery to Admin (Telegram bot, email, whatever) isn't wired up —
    // see ROADMAP.md. For now the plaintext password sits in
    // password_recovery_requests for Admin to read and relay manually,
    // which is literally what spec §6.3 describes as the intended flow.
    res.json({ result: 'sent' });
  })
);

authRouter.get(
  '/auth/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

authRouter.post('/auth/signout', requireAuth, (req, res) => {
  // Stateless JWTs — nothing to invalidate server-side. Real logout is the
  // client dropping the token. A blocklist table could be added here if a
  // hard server-side revoke is ever needed.
  res.status(204).end();
});
