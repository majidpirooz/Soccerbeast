import { Router } from 'express';
import { asyncRoute } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';
import { liveScoreClient } from '../../services/liveScoreClient.js';

export const liveScoreApiAdminRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const TOP = [requireAuth, requireAdminTier('admin_top')];

// This whole panel is a thin, honest proxy -- vendor-livescore-api already
// implements start/stop/config/status exactly as the admin panel needs.
// No reimplementation, just the auth-boundary hop (LIVESCORE_API_KEY never
// reaches the browser).

liveScoreApiAdminRouter.patch(
  '/admin/live-score-api/schedule',
  ...TOP,
  asyncRoute(async (req, res) => {
    const { pollIntervalSeconds } = req.body || {};
    // NOTE: vendor-livescore-api only exposes interval_seconds/recheck_seconds
    // as tunables (see its /control/config) -- it has no separate concept of
    // "daily start time" / "pre-match lead" / "post-match linger" the way
    // the admin-panel UI (LiveScoreApiPanel.jsx) describes; those fields are
    // currently accepted here and silently ignored. See ROADMAP.md.
    await liveScoreClient.updateConfig(pollIntervalSeconds, pollIntervalSeconds);
    res.status(204).end();
  })
);

liveScoreApiAdminRouter.post(
  '/admin/live-score-api/start',
  ...TOP,
  asyncRoute(async (req, res) => {
    await liveScoreClient.start();
    res.status(204).end();
  })
);

liveScoreApiAdminRouter.post(
  '/admin/live-score-api/stop',
  ...TOP,
  asyncRoute(async (req, res) => {
    await liveScoreClient.stop();
    res.status(204).end();
  })
);
