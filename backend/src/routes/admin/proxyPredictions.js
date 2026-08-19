import { Router } from 'express';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';

export const proxyPredictionsRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const TOP = [requireAuth, requireAdminTier('admin_top')];

proxyPredictionsRouter.get(
  '/admin/proxy-predictions/log',
  ...TOP,
  asyncRoute(async (req, res) => {
    const rows = db.prepare(
      `SELECT p.id, p.predicted_home, p.predicted_away, p.created_at,
              u.username as user_name, admin.username as admin_name,
              ht.name as home_name, at.name as away_name
       FROM predictions p
       JOIN users u ON u.id = p.user_id
       JOIN users admin ON admin.id = p.entered_by_admin_id
       JOIN app_matches m ON m.id = p.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE p.entered_by_admin_id IS NOT NULL
       ORDER BY p.created_at DESC LIMIT 50`
    ).all();
    res.json(
      rows.map((r) => ({
        id: r.id,
        user: r.user_name,
        match: `${r.home_name} vs ${r.away_name}`,
        pick: `${r.predicted_home}-${r.predicted_away}`,
        enteredBy: `admin (${r.admin_name})`,
        at: r.created_at,
      }))
    );
  })
);

proxyPredictionsRouter.post(
  '/admin/proxy-predictions',
  ...TOP,
  asyncRoute(async (req, res) => {
    const { userId, matchId, home, away } = req.body || {};
    if (!userId || !matchId || home == null || away == null) {
      throw new ApiError(400, 'missing_fields', 'userId, matchId, home, and away are required.');
    }
    // Proxy entry applies to whichever league the user is being predicted
    // for -- the frontend's ProxyPredictionPanel doesn't currently collect a
    // league selection (it assumes context from wherever it's opened), so
    // this defaults to Main League. Documented in ROADMAP.md as needing a
    // league picker added to that panel for leagues beyond Main.
    const mainLeague = db.prepare('SELECT id FROM prediction_leagues WHERE is_main_league = 1').get();
    if (!mainLeague) throw new ApiError(500, 'no_main_league', 'Main League has not been seeded yet.');

    db.prepare(
      `INSERT INTO predictions (league_id, user_id, match_id, pick_index, predicted_home, predicted_away, entered_by_admin_id)
       VALUES (?, ?, ?, 0, ?, ?, ?)
       ON CONFLICT(league_id, user_id, match_id, pick_index) DO UPDATE SET
         predicted_home = excluded.predicted_home, predicted_away = excluded.predicted_away, entered_by_admin_id = excluded.entered_by_admin_id`
    ).run(mainLeague.id, userId, matchId, home, away, req.user.id);

    res.status(204).end();
  })
);
