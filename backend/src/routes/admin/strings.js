import { Router } from 'express';
import { db } from '../../db/index.js';
import { asyncRoute } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';

export const stringsAdminRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const TOP = [requireAuth, requireAdminTier('admin_top')];

stringsAdminRouter.get(
  '/admin/strings',
  ...TOP,
  asyncRoute(async (req, res) => {
    const rows = db.prepare('SELECT id, key, en, fa FROM ui_strings ORDER BY key').all();
    res.json(rows);
  })
);

stringsAdminRouter.patch(
  '/admin/strings',
  ...TOP,
  asyncRoute(async (req, res) => {
    const edits = req.body || {}; // { [stringId]: {en?, fa?} }
    const update = db.prepare('UPDATE ui_strings SET en = COALESCE(?, en), fa = COALESCE(?, fa) WHERE id = ?');
    const tx = db.transaction(() => {
      for (const [id, { en, fa } = {}] of Object.entries(edits)) {
        update.run(en ?? null, fa ?? null, id);
      }
    });
    tx();
    res.status(204).end();
  })
);
