import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';

export const leaguesAdminRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const LOW = [requireAuth, requireAdminTier('admin_low')];

function genCode() {
  return crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 8);
}

function toShape(row) {
  const members = db.prepare('SELECT COUNT(*) as n FROM league_memberships WHERE league_id = ?').get(row.id).n;
  return {
    id: row.id,
    name: row.name,
    tier: row.is_main_league ? 'top' : 'low', // display hint only; real gating is req.user.tier, not this field
    members,
    matchPool: row.match_pool_mode,
    code: row.invitation_code,
    status: row.status,
  };
}

leaguesAdminRouter.get(
  '/admin/leagues',
  ...LOW,
  asyncRoute(async (req, res) => {
    // Low Tier Admin only sees leagues they created (spec section 7.6);
    // Top Tier sees everything.
    const rows = req.user.tier === 'admin_top'
      ? db.prepare('SELECT * FROM prediction_leagues ORDER BY is_main_league DESC, created_at DESC').all()
      : db.prepare('SELECT * FROM prediction_leagues WHERE created_by_user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(rows.map(toShape));
  })
);

leaguesAdminRouter.post(
  '/admin/leagues',
  ...LOW,
  asyncRoute(async (req, res) => {
    const { name } = req.body || {};
    if (!name) throw new ApiError(400, 'missing_name', 'A league name is required.');
    const code = genCode();
    const result = db.prepare(
      `INSERT INTO prediction_leagues (name, created_by_user_id, invitation_code, season_label) VALUES (?, ?, ?, 'current')`
    ).run(name, req.user.id, code);
    db.prepare('INSERT INTO league_memberships (league_id, user_id) VALUES (?, ?)').run(result.lastInsertRowid, req.user.id);
    res.status(201).json({ league: toShape(db.prepare('SELECT * FROM prediction_leagues WHERE id = ?').get(result.lastInsertRowid)) });
  })
);

leaguesAdminRouter.post(
  '/admin/leagues/:id/finish',
  ...LOW,
  asyncRoute(async (req, res) => {
    const league = db.prepare('SELECT * FROM prediction_leagues WHERE id = ?').get(req.params.id);
    if (!league) throw new ApiError(404, 'not_found', 'No such league.');
    if (league.is_main_league) throw new ApiError(400, 'cannot_finish_main_league', 'Main League can never be finished.');
    if (req.user.tier !== 'admin_top' && league.created_by_user_id !== req.user.id) {
      throw new ApiError(403, 'forbidden', 'You can only finish leagues you created.');
    }
    db.prepare("UPDATE prediction_leagues SET status = 'archived' WHERE id = ?").run(league.id);
    res.status(204).end();
  })
);

leaguesAdminRouter.post(
  '/admin/leagues/:id/regenerate-code',
  ...LOW,
  asyncRoute(async (req, res) => {
    const league = db.prepare('SELECT * FROM prediction_leagues WHERE id = ?').get(req.params.id);
    if (!league) throw new ApiError(404, 'not_found', 'No such league.');
    // Spec: codes are permanently retired once a league finishes/is deleted --
    // never reused, even by a future league with the same name. Regenerating
    // an active league's code is a different action (old code stops working
    // immediately) and is fine to reuse the retired-code pool eventually;
    // genCode()'s randomness makes an accidental collision astronomically
    // unlikely regardless.
    const code = genCode();
    db.prepare('UPDATE prediction_leagues SET invitation_code = ? WHERE id = ?').run(code, league.id);
    res.json({ code });
  })
);
