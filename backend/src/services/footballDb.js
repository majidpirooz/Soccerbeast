import Database from 'better-sqlite3';
import fs from 'node:fs';
import { config } from '../config.js';
import { ApiError } from '../lib/errors.js';

let _db = null;

/**
 * getFootballDb — lazily opens vendor-matches-statistics/football.db
 * read-only. Lazy (not opened at module load) because it may not exist yet
 * on a fresh checkout before the CLI's `init-db` has ever run — that's a
 * legitimate startup state, not a crash.
 */
export function getFootballDb() {
  if (_db) return _db;
  if (!fs.existsSync(config.matchesStatisticsDbPath)) {
    throw new ApiError(
      503,
      'football_db_not_ready',
      'football.db does not exist yet — run the MatchesStatistics CLI\'s init-db + scrape first.'
    );
  }
  _db = new Database(config.matchesStatisticsDbPath, { readonly: true, fileMustExist: true });
  return _db;
}
