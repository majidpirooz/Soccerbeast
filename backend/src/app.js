import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { errorHandler } from './lib/errors.js';

import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { leaguesRouter } from './routes/leagues.js';
import { liveRouter } from './routes/live.js';
import { matchDetailRouter } from './routes/matchDetail.js';
import { homeRouter } from './routes/home.js';
import { stringsRouter } from './routes/strings.js';
import { predictionsRouter } from './routes/predictions.js';

import { matchesStatisticsRouter } from './routes/admin/matchesStatistics.js';
import { liveScoreApiAdminRouter } from './routes/admin/liveScoreApi.js';
import { unmatchedTeamsRouter } from './routes/admin/unmatchedTeams.js';
import { teamsAdminRouter } from './routes/admin/teams.js';
import { arenasAdminRouter } from './routes/admin/arenas.js';
import { matchesAdminRouter } from './routes/admin/matches.js';
import { leaguesAdminRouter } from './routes/admin/leagues.js';
import { stringsAdminRouter } from './routes/admin/strings.js';
import { proxyPredictionsRouter } from './routes/admin/proxyPredictions.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve('./data/uploads')));

  app.get('/health', (req, res) => res.json({ ok: true }));

  // All routes mounted at the bare path -- API_CONTRACT.md's "relative to
  // API_BASE_URL" already implies the /api prefix lives in the frontend's
  // VITE_API_BASE_URL, not here (keeps this backend usable un-prefixed too,
  // e.g. behind an nginx location that strips /api/).
  const routers = [
    authRouter, profileRouter, homeRouter, stringsRouter, leaguesRouter, liveRouter, matchDetailRouter, predictionsRouter,
    matchesStatisticsRouter, liveScoreApiAdminRouter, unmatchedTeamsRouter,
    teamsAdminRouter, arenasAdminRouter, matchesAdminRouter, leaguesAdminRouter,
    stringsAdminRouter, proxyPredictionsRouter,
  ];
  routers.forEach((r) => app.use(r));

  app.use((req, res) => res.status(404).json({ error: { code: 'not_found', message: 'No such route.' } }));
  app.use(errorHandler);

  return app;
}
