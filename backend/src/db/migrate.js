import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Main League must always exist and can never be finished/deleted (spec §7.6).
  // Seeded here rather than lazily on first admin visit so it's guaranteed to
  // exist before any other league references it as the "shared_main" pool.
  const mainLeague = db.prepare('SELECT id FROM prediction_leagues WHERE is_main_league = 1').get();
  if (!mainLeague) {
    // created_by_user_id references users(1); if no user exists yet this
    // migration runs again cleanly after the first admin signs up (the
    // INSERT is skipped above once a main league row exists at all).
    const firstUser = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
    if (firstUser) {
      db.prepare(
        `INSERT INTO prediction_leagues (name, created_by_user_id, is_main_league, invitation_code, season_label)
         VALUES ('Main League', ?, 1, NULL, 'current')`
      ).run(firstUser.id);
      console.log('Seeded Main League.');
    } else {
      console.log('No users yet — Main League will be seeded on next migrate run after first sign-up.');
    }
  }

  console.log('Migration complete:', db.name);
}

migrate();
