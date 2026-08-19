import { Router } from 'express';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';

export const arenasAdminRouter = Router();

// Route-scoped (not router.use()) deliberately -- see matchesStatistics.js's
// top-of-file note for why a blanket router.use() here would be a bug.
const LOW = [requireAuth, requireAdminTier('admin_low')];
const TOP = [requireAuth, requireAdminTier('admin_top')];

arenasAdminRouter.get(
  '/admin/arenas',
  ...LOW,
  asyncRoute(async (req, res) => {
    const teams = db.prepare('SELECT id, name FROM teams ORDER BY name').all();
    const arenas = db.prepare('SELECT team_id, name, is_default FROM arenas ORDER BY is_default DESC, id').all();
    const byTeam = new Map();
    for (const a of arenas) {
      if (!byTeam.has(a.team_id)) byTeam.set(a.team_id, []);
      byTeam.get(a.team_id).push(a.name);
    }
    res.json(
      teams
        .filter((t) => byTeam.has(t.id))
        .map((t) => ({ id: t.id, team: t.name, arenas: byTeam.get(t.id) }))
    );
  })
);

arenasAdminRouter.post(
  '/admin/arenas/:teamId',
  ...LOW,
  asyncRoute(async (req, res) => {
    const { arena } = req.body || {};
    if (!arena) throw new ApiError(400, 'missing_arena', 'An arena name is required.');
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(req.params.teamId);
    if (!team) throw new ApiError(404, 'not_found', 'No such team.');

    const existingCount = db.prepare('SELECT COUNT(*) as n FROM arenas WHERE team_id = ?').get(team.id).n;
    db.prepare('INSERT INTO arenas (team_id, name, is_default) VALUES (?, ?, ?)').run(
      team.id, arena, existingCount === 0 ? 1 : 0 // first arena for a team becomes its default
    );
    res.status(204).end();
  })
);

// Bulk Excel import (Top Tier only per spec section 9) -- schema/table exist,
// parsing wiring not yet built. See ROADMAP.md; the openpyxl-based approach
// in vendor-matches-statistics/sources/excel_loader.py is a directly
// reusable reference for the expected column layout.
arenasAdminRouter.post('/admin/arenas/import', ...TOP, (req, res) => {
  res.status(501).json({ error: { code: 'not_implemented', message: 'Bulk arena import not yet built -- see ROADMAP.md.' } });
});
