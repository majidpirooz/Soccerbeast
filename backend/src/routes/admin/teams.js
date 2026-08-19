import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';

export const teamsAdminRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const LOW = [requireAuth, requireAdminTier('admin_low')];

const CREST_DIR = path.resolve('./data/uploads/crests');
fs.mkdirSync(CREST_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: CREST_DIR,
    filename: (req, file, cb) => cb(null, `team-${req.params.id}-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png', 'image/jpeg'].includes(file.mimetype);
    cb(ok ? null : new ApiError(400, 'invalid_file_type', 'Only PNG or JPEG crests are allowed.'), ok);
  },
});

teamsAdminRouter.get(
  '/admin/teams',
  ...LOW,
  asyncRoute(async (req, res) => {
    const rows = db.prepare('SELECT id, name, country, crest_path FROM teams ORDER BY country, name').all();
    res.json(rows.map((t) => ({ id: t.id, name: t.name, crest: t.crest_path })));
  })
);

// Low Tier Admin may only set a crest for a team that doesn't already have
// one (spec section 2.4's last bullet / the TeamCrestPanel frontend
// component's own doc comment) -- enforced here server-side, not just hidden
// in the UI, since the UI-level restriction alone isn't a real guarantee.
teamsAdminRouter.post(
  '/admin/teams/:id/crest',
  ...LOW,
  asyncRoute(async (req, res, next) => {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) throw new ApiError(404, 'not_found', 'No such team.');
    if (req.user.tier === 'admin_low' && team.crest_path) {
      throw new ApiError(403, 'crest_locked', 'This team already has a crest -- only Top Tier Admin can replace it.');
    }
    next();
  }),
  upload.single('file'),
  asyncRoute(async (req, res) => {
    let crestPath;
    if (req.file) {
      crestPath = `/uploads/crests/${path.basename(req.file.path)}`;
    } else if (req.body?.url) {
      crestPath = req.body.url; // external link, stored as-is (spec allows a link instead of an upload)
    } else {
      throw new ApiError(400, 'missing_file_or_url', 'Provide either a file or a url.');
    }
    db.prepare('UPDATE teams SET crest_path = ? WHERE id = ?').run(crestPath, req.params.id);
    res.status(204).end();
  })
);
