import { Router } from 'express';
import { spawn } from 'node:child_process';
import cron from 'node-cron';
import { config } from '../../config.js';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';
import { liveScoreClient } from '../../services/liveScoreClient.js';

export const matchesStatisticsRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const TOP = [requireAuth, requireAdminTier('admin_top')];

let lastRun = { at: null, ok: null, detail: null };
let scheduledTask = null;

/**
 * runScrapeNow -- actually invokes vendor-matches-statistics/cli.py as a
 * subprocess. This is the real "Run Now" button, not a stub -- it shells
 * out to the exact command documented in that project's own README.
 */
function runScrapeNow() {
  return new Promise((resolve) => {
    const args = ['cli.py', '--db', config.matchesStatisticsDbPath, 'scrape', '--mode', 'online'];
    const proc = spawn(config.matchesStatisticsPython, args, { cwd: config.matchesStatisticsDir });

    let output = '';
    proc.stdout.on('data', (d) => (output += d));
    proc.stderr.on('data', (d) => (output += d));

    proc.on('close', (code) => {
      lastRun = { at: new Date().toISOString(), ok: code === 0, detail: output.trim().slice(-2000) };
      resolve(lastRun);
    });
    proc.on('error', (err) => {
      lastRun = { at: new Date().toISOString(), ok: false, detail: `Failed to launch: ${err.message}` };
      resolve(lastRun);
    });
  });
}

function applySchedule(cronExpr) {
  if (scheduledTask) scheduledTask.stop();
  scheduledTask = cronExpr ? cron.schedule(cronExpr, () => runScrapeNow()) : null;
}

const savedSchedule = db.prepare("SELECT value_json FROM admin_config WHERE key = 'matches_statistics_schedule'").get();
if (savedSchedule) {
  const parsed = JSON.parse(savedSchedule.value_json);
  if (parsed.scheduled && parsed.cron) applySchedule(parsed.cron);
}

matchesStatisticsRouter.get(
  '/admin/scraper-status',
  ...TOP,
  asyncRoute(async (req, res) => {
    const saved = db.prepare("SELECT value_json FROM admin_config WHERE key = 'matches_statistics_schedule'").get();
    const schedule = saved ? JSON.parse(saved.value_json) : { mode: 'online', scheduled: false, cron: null };

    // Merged from vendor-livescore-api here (rather than a separate route)
    // since the frontend's admin panel expects one combined
    // {matchesStatistics, liveScoreApi} shape from a single GET, per
    // API_CONTRACT.md. Degrades gracefully if that service isn't up yet --
    // an admin should see "can't reach it", not a 500 that breaks the whole page.
    let liveScoreApi = { running: false, dailyStartTime: null, preMatchLeadMinutes: null, postMatchLingerMinutes: null, pollIntervalSeconds: null, lastTick: null, unreachable: true };
    try {
      const status = await liveScoreClient.status();
      liveScoreApi = {
        running: status.running,
        dailyStartTime: null, // see admin/liveScoreApi.js's note -- not a concept that service exposes
        preMatchLeadMinutes: null,
        postMatchLingerMinutes: null,
        pollIntervalSeconds: status.interval_seconds,
        lastTick: status.last_run_at ? new Date(status.last_run_at * 1000).toISOString() : null,
      };
    } catch {
      /* left as the unreachable default above */
    }

    res.json({
      matchesStatistics: {
        mode: schedule.mode,
        lastRun: lastRun.at,
        lastResult: lastRun.ok === null ? 'never run' : lastRun.ok ? 'success' : 'error',
        scheduled: schedule.scheduled,
        scheduleCron: schedule.cron,
      },
      liveScoreApi,
    });
  })
);

matchesStatisticsRouter.post(
  '/admin/matches-statistics/run',
  ...TOP,
  asyncRoute(async (req, res) => {
    res.status(202).json({ started: true });
    runScrapeNow();
  })
);

matchesStatisticsRouter.patch(
  '/admin/matches-statistics/schedule',
  ...TOP,
  asyncRoute(async (req, res) => {
    const { mode, scheduled, cron: cronExpr } = req.body || {};
    if (scheduled && cronExpr && !cron.validate(cronExpr)) {
      throw new ApiError(400, 'invalid_cron', 'That is not a valid cron expression.');
    }
    db.prepare(
      `INSERT INTO admin_config (key, value_json, updated_at) VALUES ('matches_statistics_schedule', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
    ).run(JSON.stringify({ mode, scheduled, cron: cronExpr }));

    applySchedule(scheduled ? cronExpr : null);
    res.status(204).end();
  })
);

// File uploads (offline HTML batch / online workbook) are schema'd for but
// not wired up yet -- see ROADMAP.md. The CLI itself already supports both
// (`scrape --mode offline --dir` and `import-teams --xlsx`); this just needs
// multer + a temp-dir handoff to a runScrapeNow()-style subprocess call.
matchesStatisticsRouter.post('/admin/matches-statistics/upload', ...TOP, (req, res) => {
  res.status(501).json({ error: { code: 'not_implemented', message: 'File upload wiring not yet built -- see ROADMAP.md.' } });
});
