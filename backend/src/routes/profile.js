import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { hashPassword } from '../lib/auth.js';
import { asyncRoute, ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const profileRouter = Router();

const AVATAR_DIR = path.resolve('./data/uploads/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => cb(null, `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

profileRouter.get(
  '/profile',
  requireAuth,
  asyncRoute(async (req, res) => {
    const previousLeagues = db.prepare(
      `SELECT pl.id, pl.name, pl.season_label FROM prediction_leagues pl
       JOIN league_memberships lm ON lm.league_id = pl.id
       WHERE lm.user_id = ? AND pl.status = 'archived'`
    ).all(req.user.id);

    res.json({
      user: {
        id: req.user.id,
        name: req.user.username,
        initials: req.user.username.slice(0, 2).toUpperCase(),
      },
      // TODO (see ROADMAP.md): weeklyPoints/overallPoints/history depend on
      // the prediction-scoring engine, which isn't built yet -- returning
      // honest zeros/empty rather than fabricated numbers.
      progress: { weeklyPoints: 0, overallPoints: 0, history: [] },
      mode: req.user.prediction_mode,
      lang: req.user.lang,
      previousLeagues: previousLeagues.map((l) => ({ id: l.id, label: `${l.name} ${l.season_label || ''}`.trim() })),
    });
  })
);

profileRouter.patch(
  '/profile/account',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { username, password } = req.body || {};
    if (username && username !== req.user.username) {
      const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
      if (taken) throw new ApiError(409, 'username_taken', 'That username is already in use.');
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.user.id);
    }
    if (password) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), req.user.id);
    }
    db.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?").run(req.user.id);
    res.status(204).end();
  })
);

profileRouter.post('/profile/avatar', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) throw new ApiError(400, 'missing_file', 'No file uploaded.');
  const avatarUrl = `/uploads/avatars/${path.basename(req.file.path)}`;
  db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(avatarUrl, req.user.id);
  res.json({ avatarUrl });
});

profileRouter.patch(
  '/profile/preferences',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { mode, lang } = req.body || {};
    if (mode && !['normal', 'combined'].includes(mode)) throw new ApiError(400, 'invalid_mode', 'mode must be normal or combined.');
    if (lang && !['en', 'fa'].includes(lang)) throw new ApiError(400, 'invalid_lang', 'lang must be en or fa.');
    db.prepare('UPDATE users SET prediction_mode = COALESCE(?, prediction_mode), lang = COALESCE(?, lang) WHERE id = ?')
      .run(mode || null, lang || null, req.user.id);
    // NOTE: spec section 7.4 says a mode change should apply "starting from
    // the next unlocked match", not retroactively or immediately for
    // already-locked picks. That forward-only enforcement belongs in the
    // (not-yet-built) prediction-submission logic, which would need to read
    // this timestamp -- not implemented here yet; see ROADMAP.md.
    res.status(204).end();
  })
);

// TODO (see ROADMAP.md): real weekly-points-over-time series needs the
// scoring engine. Returns an empty series per requested user rather than
// fabricated data.
profileRouter.get(
  '/profile/compare',
  requireAuth,
  asyncRoute(async (req, res) => {
    const ids = (req.query.userIds || '').split(',').filter(Boolean).map(Number);
    const users = ids.length ? db.prepare(`SELECT id, username FROM users WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) : [];
    res.json({
      series: users.map((u) => ({
        user: { id: u.id, name: u.username, initials: u.username.slice(0, 2).toUpperCase() },
        points: [],
      })),
    });
  })
);

profileRouter.get(
  '/users',
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = db.prepare('SELECT id, username FROM users ORDER BY username').all();
    res.json(rows.map((u) => ({ id: u.id, name: u.username })));
  })
);

profileRouter.post(
  '/prediction-leagues',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { name } = req.body || {};
    if (!name) throw new ApiError(400, 'missing_name', 'A league name is required.');

    const code = crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 8);
    const result = db.prepare(
      `INSERT INTO prediction_leagues (name, created_by_user_id, invitation_code, season_label) VALUES (?, ?, ?, 'current')`
    ).run(name, req.user.id, code);
    db.prepare('INSERT INTO league_memberships (league_id, user_id) VALUES (?, ?)').run(result.lastInsertRowid, req.user.id);

    // Spec section 7.6: creating a league is how a regular user becomes a
    // Low Tier Admin. Only promotes if they aren't some tier of admin already.
    if (req.user.tier === 'user') {
      db.prepare("UPDATE users SET tier = 'admin_low' WHERE id = ?").run(req.user.id);
    }

    res.status(201).json({ league: { id: result.lastInsertRowid, name, code } });
  })
);
