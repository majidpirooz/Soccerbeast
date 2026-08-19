import { Router } from 'express';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';

export const unmatchedTeamsRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const TOP = [requireAuth, requireAdminTier('admin_top')];

unmatchedTeamsRouter.get(
  '/admin/unmatched-teams',
  ...TOP,
  asyncRoute(async (req, res) => {
    const rows = db
      .prepare('SELECT id, raw_text, source, language, first_seen_at FROM team_aliases WHERE team_id IS NULL ORDER BY first_seen_at DESC')
      .all();
    res.json(
      rows.map((r) => ({
        id: r.id,
        source: r.source,
        rawText: r.raw_text,
        language: r.language,
        seenAt: r.first_seen_at,
      }))
    );
  })
);

unmatchedTeamsRouter.post(
  '/admin/unmatched-teams/:id/link-alias',
  ...TOP,
  asyncRoute(async (req, res) => {
    const { teamId } = req.body || {};
    const alias = db.prepare('SELECT * FROM team_aliases WHERE id = ?').get(req.params.id);
    if (!alias) throw new ApiError(404, 'not_found', 'No such unmatched entry.');
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId);
    if (!team) throw new ApiError(400, 'invalid_team', 'No such team to link to.');

    db.prepare("UPDATE team_aliases SET team_id = ?, resolved_at = datetime('now') WHERE id = ?").run(teamId, alias.id);
    res.status(204).end();
  })
);

unmatchedTeamsRouter.post(
  '/admin/unmatched-teams/:id/create-team',
  ...TOP,
  asyncRoute(async (req, res) => {
    const { name, country } = req.body || {};
    const alias = db.prepare('SELECT * FROM team_aliases WHERE id = ?').get(req.params.id);
    if (!alias) throw new ApiError(404, 'not_found', 'No such unmatched entry.');
    if (!name) throw new ApiError(400, 'missing_name', 'A team name is required.');

    const insert = db.prepare('INSERT INTO teams (name, persian_name, country) VALUES (?, ?, ?)');
    const persianName = alias.language === 'fa' ? alias.raw_text : null;
    const result = insert.run(name, persianName, country || null);

    db.prepare("UPDATE team_aliases SET team_id = ?, resolved_at = datetime('now') WHERE id = ?")
      .run(result.lastInsertRowid, alias.id);

    res.status(201).json({ team: { id: result.lastInsertRowid, name, country: country || null } });
  })
);
