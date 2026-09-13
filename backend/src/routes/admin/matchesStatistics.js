import { Router } from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import cron from 'node-cron';
import { config } from '../../config.js';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';
import { liveScoreClient } from '../../services/liveScoreClient.js';
import { getFootballDb } from '../../services/footballDb.js';

export const matchesStatisticsRouter = Router();
// Route-scoped (not router.use()) -- see this file's earlier revision's note.
const TOP = [requireAuth, requireAdminTier('admin_top')];

let lastRun = { at: null, ok: null, detail: null };
let scheduledTask = null;

/**
 * runCli -- the one place every vendor-matches-statistics/cli.py invocation
 * goes through. Returns {ok, output} rather than throwing, since a non-zero
 * exit here is an expected, informative outcome (e.g. "no such table" on a
 * database that's never been initialized), not a bug in this wrapper.
 */
function runCli(args) {
  return new Promise((resolve) => {
    const proc = spawn(config.matchesStatisticsPython, ['cli.py', '--db', config.matchesStatisticsDbPath, ...args], {
      cwd: config.matchesStatisticsDir,
    });
    let output = '';
    proc.stdout.on('data', (d) => (output += d));
    proc.stderr.on('data', (d) => (output += d));
    proc.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }));
    proc.on('error', (err) => resolve({ ok: false, output: `Failed to launch: ${err.message}` }));
  });
}

/**
 * ensureSchema -- runs `init-db`, which is nothing but `CREATE TABLE IF NOT
 * EXISTS` statements (see vendor-matches-statistics/db.py's own init_db()),
 * so it's always safe to re-run before any other command.
 *
 * This is the fix for a real bug found auditing the vendored CLI directly:
 * `cmd_scrape` calls `db.connect()`, which only opens a raw sqlite3
 * connection -- it does NOT create tables. Only `init_db()` does that, and
 * nothing was ever calling it before a scrape. On a genuinely fresh
 * deployment (football.db doesn't exist yet), clicking "Run Now" would
 * crash with "sqlite3.OperationalError: no such table: teams" every time,
 * with zero way to recover from the web UI. Running this first removes
 * that whole failure class.
 */
function ensureSchema() {
  return runCli(['init-db']);
}

/** countTeams -- 0 if football.db doesn't exist yet or the table isn't there; that's a legitimate "no teams" answer, not an error to surface. */
function countTeams() {
  try {
    const fdb = getFootballDb();
    return fdb.prepare('SELECT COUNT(*) as n FROM teams').get().n;
  } catch {
    return 0;
  }
}

/**
 * runScrapeNow -- the real "Run Now" button. Beyond just invoking the CLI,
 * this now:
 *  1. Ensures the schema exists first (see ensureSchema's doc comment).
 *  2. Checks whether any teams are actually registered before scraping.
 *     Without this check, `cmd_scrape` silently returns success on zero
 *     teams (see vendor-matches-statistics/cli.py: `if not teams: return`)
 *     -- meaning an admin who never uploaded a team-links workbook would
 *     see a green "success" status forever while the site stayed
 *     completely empty, with no signal anything was wrong. This surfaces
 *     that as a clear, actionable message instead.
 */
function runScrapeNow() {
  return (async () => {
    const init = await ensureSchema();
    if (!init.ok) {
      lastRun = { at: new Date().toISOString(), ok: false, detail: `Failed to initialize database:\n${init.output}`.slice(-2000) };
      return lastRun;
    }

    const teamCount = countTeams();
    if (teamCount === 0) {
      lastRun = {
        at: new Date().toISOString(),
        ok: false,
        detail: 'No teams registered yet -- upload a team-links workbook first (Team-links workbook field, online mode), then Run Now again.',
      };
      return lastRun;
    }

    const result = await runCli(['scrape', '--mode', 'online']);
    lastRun = { at: new Date().toISOString(), ok: result.ok, detail: (result.output || `Scraped ${teamCount} team(s).`).slice(-2000) };
    return lastRun;
  })();
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

    let liveScoreApi = { running: false, dailyStartTime: null, preMatchLeadMinutes: null, postMatchLingerMinutes: null, pollIntervalSeconds: null, lastTick: null, unreachable: true };
    try {
      const status = await liveScoreClient.status();
      liveScoreApi = {
        running: status.running,
        dailyStartTime: null,
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
        lastRunDetail: lastRun.detail,
        teamsRegistered: countTeams(),
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

// ---- Upload: the actual fix. Two genuinely different jobs share this one
// endpoint, keyed by `mode`:
//   'online'  -> a single Excel workbook -> `import-teams --xlsx <path>`.
//                Registers teams; does NOT scrape. The separate "Run Now"
//                button (above) is what then fetches their live pages.
//   'offline' -> one or more saved HTML pages -> `scrape --mode offline
//                --dir <tempdir>`. Unlike the online path, this runs the
//                scrape immediately as part of the same upload -- offline
//                files are an inherently one-shot "process this batch now"
//                action, there's no separate persistent step to defer to.
//
// Filenames are preserved exactly as uploaded (multer's default disk
// filename would rename them) because vendor-matches-statistics'
// scan_offline_directory() matches files by their *-Matches.html /
// *-team-statistic.html suffix -- renaming them would make every file
// silently unmatched.
const uploadTmpDir = path.join(os.tmpdir(), 'soccerbeast-matchstats-uploads');
fs.mkdirSync(uploadTmpDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!req._uploadDir) {
        req._uploadDir = path.join(uploadTmpDir, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(req._uploadDir, { recursive: true });
      }
      cb(null, req._uploadDir); // every file in one request shares one dir
    },
    filename: (req, file, cb) => cb(null, file.originalname), // preserve exactly -- see doc comment above
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 50 },
});

matchesStatisticsRouter.post(
  '/admin/matches-statistics/upload',
  ...TOP,
  upload.fields([
    { name: 'file', maxCount: 1 }, // online mode: the xlsx workbook
    { name: 'files', maxCount: 50 }, // offline mode: the HTML batch
  ]),
  asyncRoute(async (req, res) => {
    const mode = req.body?.mode;
    const init = await ensureSchema();
    if (!init.ok) throw new ApiError(500, 'init_failed', `Could not initialize the database:\n${init.output}`.slice(0, 500));

    if (mode === 'online') {
      const workbook = req.files?.file?.[0];
      if (!workbook) throw new ApiError(400, 'missing_file', 'Upload the team-links workbook (.xlsx) for online mode.');

      const result = await runCli(['import-teams', '--xlsx', workbook.path]);
      fs.rm(path.dirname(workbook.path), { recursive: true, force: true }, () => {});
      if (!result.ok) throw new ApiError(422, 'import_failed', result.output.slice(0, 1000) || 'import-teams failed.');

      return res.status(202).json({ ok: true, teamsRegistered: countTeams(), detail: result.output.slice(-1000) });
    }

    if (mode === 'offline') {
      const htmlFiles = req.files?.files || [];
      if (htmlFiles.length === 0) throw new ApiError(400, 'missing_files', 'Upload at least one saved HTML page for offline mode.');

      const dir = path.dirname(htmlFiles[0].path);
      const result = await runCli(['scrape', '--mode', 'offline', '--dir', dir]);
      fs.rm(dir, { recursive: true, force: true }, () => {});

      lastRun = { at: new Date().toISOString(), ok: result.ok, detail: (result.output || `Processed ${htmlFiles.length} file(s).`).slice(-2000) };
      if (!result.ok) throw new ApiError(422, 'scrape_failed', result.output.slice(0, 1000) || 'Offline scrape failed.');

      return res.status(202).json({ ok: true, filesProcessed: htmlFiles.length, detail: result.output.slice(-1000) });
    }

    throw new ApiError(400, 'invalid_mode', "mode must be 'online' or 'offline'.");
  })
);
