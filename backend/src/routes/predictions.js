import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncRoute, ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getLeaderboardWithRankChange } from '../services/scoring.js';
import { getAppMatch } from '../services/appMatches.js';

export const predictionsRouter = Router();

predictionsRouter.get(
  '/prediction-leagues',
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = db.prepare(
      `SELECT pl.id, pl.name FROM prediction_leagues pl
       JOIN league_memberships lm ON lm.league_id = pl.id
       WHERE lm.user_id = ? AND pl.status = 'active' ORDER BY pl.is_main_league DESC, pl.name`
    ).all(req.user.id);
    res.json(rows);
  })
);

predictionsRouter.get(
  '/prediction-leagues/:id/leaderboard',
  asyncRoute(async (req, res) => {
    // Signed-out users see Main League's leaderboard (spec section 6.9);
    // requireAuth is intentionally NOT applied to this one route.
    const league = db.prepare('SELECT * FROM prediction_leagues WHERE id = ?').get(req.params.id);
    if (!league) throw new ApiError(404, 'not_found', 'No such league.');

    const rows = getLeaderboardWithRankChange(league.id);
    const users = new Map(
      db.prepare(`SELECT id, username FROM users WHERE id IN (${rows.map(() => '?').join(',') || 'NULL'})`)
        .all(...rows.map((r) => r.userId))
        .map((u) => [u.id, u])
    );

    res.json({
      rows: rows.map((r) => {
        const u = users.get(r.userId);
        return {
          rank: r.rank,
          change: r.change,
          user: { id: r.userId, name: u?.username || 'Unknown', initials: (u?.username || '??').slice(0, 2).toUpperCase() },
          exact: r.exact,
          pts: r.points,
          trophies: { gold: r.golden > 0, diamond: r.diamond > 0 },
          // Extra columns from spec section 6.9's full column list, beyond what
          // the compact frontend Leaderboard component currently renders --
          // included so a future wider desktop layout can opt in without a new endpoint.
          winnerGD: r.winnerGD,
          winnerOnly: r.winnerOnly,
          wrong: r.wrong,
          goldenCount: r.golden,
          diamondCount: r.diamond,
        };
      }),
    });
  })
);

predictionsRouter.get(
  '/prediction-leagues/:id/matches-to-predict',
  requireAuth,
  asyncRoute(async (req, res) => {
    const league = db.prepare('SELECT * FROM prediction_leagues WHERE id = ?').get(req.params.id);
    if (!league) throw new ApiError(404, 'not_found', 'No such league.');

    const rows = db.prepare(
      `SELECT m.*, ht.name as home_name, ht.crest_path as home_crest, at.name as away_name, at.crest_path as away_crest
       FROM league_match_pool lmp
       JOIN app_matches m ON m.id = lmp.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE lmp.league_id = ? AND lmp.published = 1 AND m.deleted_at IS NULL AND m.status != 'finished'
       ORDER BY m.kickoff_utc ASC`
    ).all(league.id);

    const mode = db.prepare('SELECT prediction_mode FROM users WHERE id = ?').get(req.user.id).prediction_mode;

    res.json(
      rows.map((m) => {
        const picks = db.prepare('SELECT * FROM predictions WHERE league_id = ? AND user_id = ? AND match_id = ? ORDER BY pick_index')
          .all(league.id, req.user.id, m.id);
        return {
          match: {
            id: m.id,
            competition: { name: m.competition_name },
            home: { id: m.home_team_id, name: m.home_name, short: m.home_name.slice(0, 2).toUpperCase(), crest: m.home_crest },
            away: { id: m.away_team_id, name: m.away_name, short: m.away_name.slice(0, 2).toUpperCase(), crest: m.away_crest },
            status: m.status === 'locked' ? 'locked' : 'open',
            kickoffLabel: m.kickoff_utc,
          },
          mode,
          initial: picks[0] ? { home: picks[0].predicted_home, away: picks[0].predicted_away } : undefined,
          initial2: picks[1] ? { home: picks[1].predicted_home, away: picks[1].predicted_away } : undefined,
          enteredByAdmin: picks.some((p) => p.entered_by_admin_id),
        };
      })
    );
  })
);

predictionsRouter.post(
  '/predictions',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { leagueId, matchId, picks } = req.body || {};
    if (!leagueId || !matchId || !Array.isArray(picks) || picks.length === 0) {
      throw new ApiError(400, 'missing_fields', 'leagueId, matchId, and at least one pick are required.');
    }

    const match = getAppMatch(matchId);
    if (!match) throw new ApiError(404, 'match_not_found', 'No such match.');
    // Spec section 8: locks 1 minute before kickoff, or manually.
    if (match.status === 'locked' || (match.kickoff_utc && new Date(match.kickoff_utc) - Date.now() < 60000)) {
      throw new ApiError(409, 'match_locked', 'Predictions are closed for this match.');
    }

    const membership = db.prepare('SELECT 1 FROM league_memberships WHERE league_id = ? AND user_id = ?').get(leagueId, req.user.id);
    if (!membership) throw new ApiError(403, 'not_a_member', 'You are not a member of this league.');

    const upsert = db.prepare(
      `INSERT INTO predictions (league_id, user_id, match_id, pick_index, predicted_home, predicted_away)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(league_id, user_id, match_id, pick_index) DO UPDATE SET
         predicted_home = excluded.predicted_home, predicted_away = excluded.predicted_away, entered_by_admin_id = NULL`
    );
    const tx = db.transaction(() => {
      picks.forEach((p, i) => upsert.run(leagueId, req.user.id, matchId, i, Number(p.home), Number(p.away)));
    });
    tx();

    res.status(204).end();
  })
);
