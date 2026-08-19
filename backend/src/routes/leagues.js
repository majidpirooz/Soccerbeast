import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncRoute } from '../lib/errors.js';
import { getStandings, getFixtures } from '../services/standings.js';

export const leaguesRouter = Router();

// "Competitions" as the frontend selector understands them are really
// distinct competition_definitions rows, grouped by display_name so every
// season of the same competition shares one entry in the dropdown.
leaguesRouter.get(
  '/competitions',
  asyncRoute(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT display_name, MIN(id) as id FROM competition_definitions GROUP BY display_name ORDER BY display_name`
      )
      .all();
    res.json(rows.map((r) => ({ id: r.id, name: r.display_name })));
  })
);

leaguesRouter.get(
  '/competitions/:id/seasons',
  asyncRoute(async (req, res) => {
    const def = db.prepare('SELECT display_name FROM competition_definitions WHERE id = ?').get(req.params.id);
    if (!def) return res.json([]);
    const rows = db
      .prepare(
        `SELECT id, season_label FROM competition_definitions WHERE display_name = ? ORDER BY season_start_date DESC`
      )
      .all(def.display_name);
    res.json(rows.map((r) => ({ id: r.id, label: r.season_label })));
  })
);

leaguesRouter.get(
  '/competitions/:competitionId/standings',
  asyncRoute(async (req, res) => {
    // `:competitionId` here is actually a competition_definitions id (one
    // specific season) — the frontend passes whichever season id it has
    // selected (defaulting to the first from /seasons), per API_CONTRACT.md.
    const seasonId = req.query.season || req.params.competitionId;
    res.json({ rows: getStandings(seasonId) });
  })
);

leaguesRouter.get(
  '/competitions/:competitionId/fixtures',
  asyncRoute(async (req, res) => {
    const seasonId = req.query.season || req.params.competitionId;
    res.json({ weeks: getFixtures(seasonId) });
  })
);
