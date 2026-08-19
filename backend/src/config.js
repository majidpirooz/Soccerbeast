import 'dotenv/config';
import path from 'node:path';

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: required('JWT_SECRET', 'dev-only-insecure-secret'),
  appDbPath: path.resolve(process.env.APP_DB_PATH || './data/soccerbeast.db'),

  matchesStatisticsDir: path.resolve(process.env.MATCHES_STATISTICS_DIR || './vendor-matches-statistics'),
  matchesStatisticsPython: process.env.MATCHES_STATISTICS_PYTHON || './vendor-matches-statistics/venv/bin/python3',
  matchesStatisticsDbPath: path.resolve(
    process.env.MATCHES_STATISTICS_DB_PATH || './vendor-matches-statistics/football.db'
  ),

  liveScoreApiBaseUrl: process.env.LIVESCORE_API_BASE_URL || 'http://127.0.0.1:8000',
  liveScoreApiKey: process.env.LIVESCORE_API_KEY || '',
};
