#!/usr/bin/env node
/**
 * sync-teams.js — reads vendor-matches-statistics/football.db's `teams`
 * table and upserts into this backend's own `teams` table, recording each
 * one's matchstats_team_id so standings.js can join back to its matches.
 *
 * Run manually after `import-teams` on the Python side, or wire into a cron
 * alongside its own scrape schedule (see BACKEND_SETUP.md). Idempotent —
 * matches existing rows on (name, country).
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import { config } from '../src/config.js';
import { db } from '../src/db/index.js';

if (!fs.existsSync(config.matchesStatisticsDbPath)) {
  console.error(
    `No football.db found at ${config.matchesStatisticsDbPath}. Run the MatchesStatistics ` +
      `CLI's 'init-db' + 'import-teams' first (see vendor-matches-statistics/README.md).`
  );
  process.exit(1);
}

const statsDb = new Database(config.matchesStatisticsDbPath, { readonly: true });
const sourceTeams = statsDb.prepare('SELECT id, name, persian_name, country FROM teams').all();

const upsert = db.prepare(`
  INSERT INTO teams (name, persian_name, country, matchstats_team_id)
  VALUES (@name, @persian_name, @country, @matchstats_team_id)
  ON CONFLICT(name, country) DO UPDATE SET
    persian_name = excluded.persian_name,
    matchstats_team_id = excluded.matchstats_team_id
`);

const tx = db.transaction((teams) => {
  for (const t of teams) {
    upsert.run({
      name: t.name,
      persian_name: t.persian_name,
      country: t.country,
      matchstats_team_id: t.id,
    });
  }
});

tx(sourceTeams);
statsDb.close();

console.log(`Synced ${sourceTeams.length} team(s) from ${config.matchesStatisticsDbPath}.`);
