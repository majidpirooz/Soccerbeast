import { Router } from 'express';
import { db } from '../../db/index.js';
import { asyncRoute, ApiError } from '../../lib/errors.js';
import { requireAuth, requireAdminTier } from '../../middleware/requireAuth.js';
import { searchAppMatches, getAppMatch, toResultEditShape, toPoolCandidateShape } from '../../services/appMatches.js';

export const matchesAdminRouter = Router();
// Route-scoped (not router.use()) -- see matchesStatistics.js's note.
const LOW = [requireAuth, requireAdminTier('admin_low')];

/**
 * resolveArenaId -- spec section 9's "default match arena is the home
 * team's first-listed arena, with per-match override". `arenaInput` is
 * whatever the manual-entry form's free-text arena field contained (may be
 * empty/undefined, an existing arena's exact name, or a brand-new venue
 * name never seen before for this team).
 */
function resolveArenaId(homeTeamId, arenaInput) {
  if (!arenaInput) {
    const def = db.prepare('SELECT id FROM arenas WHERE team_id = ? AND is_default = 1').get(homeTeamId);
    return def?.id ?? null;
  }
  const existing = db.prepare('SELECT id FROM arenas WHERE team_id = ? AND name = ?').get(homeTeamId, arenaInput);
  if (existing) return existing.id;

  const existingCount = db.prepare('SELECT COUNT(*) as n FROM arenas WHERE team_id = ?').get(homeTeamId).n;
  const result = db
    .prepare('INSERT INTO arenas (team_id, name, is_default) VALUES (?, ?, ?)')
    .run(homeTeamId, arenaInput, existingCount === 0 ? 1 : 0);
  return result.lastInsertRowid;
}

// ---- Manual entry (spec section 2.4 / section 6.11 item 3) ----

matchesAdminRouter.post(
  '/admin/matches',
  ...LOW,
  asyncRoute(async (req, res) => {
    const { competitionId, homeTeam, awayTeam, kickoff, arena, reasonTag, watchLinks } = req.body || {};
    if (!homeTeam || !awayTeam || !kickoff) {
      throw new ApiError(400, 'missing_fields', 'Home team, away team, and kickoff are required.');
    }
    // homeTeam/awayTeam here are expected to be team ids (the frontend form's
    // SelectField would need to be backed by a real team picker -- currently
    // ManualMatchEntryPanel takes free-text team names, which is a mismatch
    // this route doesn't paper over. Documented in ROADMAP.md.
    const homeTeamRow = db.prepare('SELECT id FROM teams WHERE id = ? OR name = ?').get(homeTeam, homeTeam);
    const awayTeamRow = db.prepare('SELECT id FROM teams WHERE id = ? OR name = ?').get(awayTeam, awayTeam);
    if (!homeTeamRow || !awayTeamRow) {
      throw new ApiError(400, 'unknown_team', 'Home/away team must already exist -- add them via Team Crests first if new.');
    }

    const def = competitionId ? db.prepare('SELECT display_name FROM competition_definitions WHERE id = ?').get(competitionId) : null;

    // spec section 9: default match arena is the home team's first-listed
    // (is_default) arena; an explicit `arena` value overrides that -- either
    // naming an existing arena for the home team, or a new one-off venue
    // (recorded as a non-default arena for that team so it's available to
    // pick again later without re-typing it).
    const arenaId = resolveArenaId(homeTeamRow.id, arena);

    const result = db
      .prepare(
        `INSERT INTO app_matches
           (source, competition_name, home_team_id, away_team_id, kickoff_utc, arena_id, reason_tag, watch_links_json,
            is_knockout, created_by_user_id)
         VALUES ('manual', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        def?.display_name || null,
        homeTeamRow.id,
        awayTeamRow.id,
        kickoff,
        arenaId,
        reasonTag || null,
        JSON.stringify(watchLinks || []),
        reasonTag === 'knockout_round' ? 1 : 0,
        req.user.id
      );

    res.status(201).json({ match: toResultEditShape(getAppMatch(result.lastInsertRowid)) });
  })
);

// ---- Result editing + delete (spec section 9 / section 6.11) ----

matchesAdminRouter.get(
  '/admin/matches',
  ...LOW,
  asyncRoute(async (req, res) => {
    res.json(searchAppMatches(req.query.query));
  })
);

matchesAdminRouter.patch(
  '/admin/matches/:id/result',
  ...LOW,
  asyncRoute(async (req, res) => {
    const match = getAppMatch(req.params.id);
    if (!match) throw new ApiError(404, 'not_found', 'No such match.');

    const { normalTime, extraTime, penalties } = req.body || {};
    const nt = normalTime || {};
    db.prepare(
      `UPDATE app_matches SET
         normal_time_home = ?, normal_time_away = ?,
         extra_time_home = ?, extra_time_away = ?,
         penalties_home = ?, penalties_away = ?,
         home_score = ?, away_score = ?,
         status = 'finished', updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nt.home ?? null, nt.away ?? null,
      extraTime?.home ?? null, extraTime?.away ?? null,
      penalties?.home ?? null, penalties?.away ?? null,
      nt.home ?? null, nt.away ?? null, // home_score/away_score mirror normal time -- extra time/penalties only decide the winner for knockouts, not the recorded scoreline
      req.params.id
    );
    res.status(204).end();
  })
);

matchesAdminRouter.delete(
  '/admin/matches/:id',
  ...LOW,
  asyncRoute(async (req, res) => {
    // Soft delete -- spec is explicit this must work "even after publication
    // or after it's finished", so this never hard-deletes (would orphan any
    // predictions already made against it).
    const result = db.prepare("UPDATE app_matches SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL").run(req.params.id);
    if (result.changes === 0) throw new ApiError(404, 'not_found', 'No such match (or already deleted).');
    res.status(204).end();
  })
);

// ---- Match pool (picker + selected/unpublish) ----

matchesAdminRouter.get(
  '/admin/match-pool-candidates',
  ...LOW,
  asyncRoute(async (req, res) => {
    const { leagueId, weekId } = req.query;
    const rows = db.prepare(
      `SELECT m.*, ht.name as home_name, ht.crest_path as home_crest, at.name as away_name, at.crest_path as away_crest
       FROM app_matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       WHERE m.deleted_at IS NULL
       ORDER BY m.kickoff_utc ASC`
    ).all();

    const pooled = new Set(
      db.prepare('SELECT match_id FROM league_match_pool WHERE league_id = ? AND (? IS NULL OR week_label = ?)')
        .all(leagueId, weekId || null, weekId || null)
        .map((r) => r.match_id)
    );

    res.json(rows.map((r) => toPoolCandidateShape(r, pooled.has(r.id))));
  })
);

matchesAdminRouter.get(
  '/admin/match-pool-weeks',
  ...LOW,
  asyncRoute(async (req, res) => {
    const rows = db.prepare('SELECT DISTINCT week_label FROM league_match_pool WHERE week_label IS NOT NULL ORDER BY week_label').all();
    const weeks = rows.map((r) => ({ id: r.week_label, label: r.week_label }));
    res.json(weeks.length ? weeks : [{ id: 'w1', label: 'Week 1' }]);
  })
);

matchesAdminRouter.post(
  '/admin/match-pool',
  ...LOW,
  asyncRoute(async (req, res) => {
    const { leagueId, weekId, matchIds } = req.body || {};
    if (!leagueId || !Array.isArray(matchIds) || matchIds.length === 0) {
      throw new ApiError(400, 'missing_fields', 'leagueId and at least one matchId are required.');
    }
    const insert = db.prepare(
      'INSERT OR IGNORE INTO league_match_pool (league_id, match_id, week_label, published) VALUES (?, ?, ?, 1)'
    );
    const tx = db.transaction(() => matchIds.forEach((mid) => insert.run(leagueId, mid, weekId || null)));
    tx();
    res.status(204).end();
  })
);

matchesAdminRouter.get(
  '/admin/selected-matches',
  ...LOW,
  asyncRoute(async (req, res) => {
    const rows = db.prepare(
      `SELECT lmp.id, lmp.week_label, lmp.published, pl.name as league_name,
              ht.name as home_name, at.name as away_name
       FROM league_match_pool lmp
       JOIN prediction_leagues pl ON pl.id = lmp.league_id
       JOIN app_matches m ON m.id = lmp.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       ORDER BY lmp.id DESC`
    ).all();
    res.json(
      rows.map((r) => ({
        id: r.id,
        match: `${r.home_name} vs ${r.away_name}`,
        week: r.week_label || '',
        league: r.league_name,
        published: !!r.published,
      }))
    );
  })
);

matchesAdminRouter.post(
  '/admin/selected-matches/:id/unpublish',
  ...LOW,
  asyncRoute(async (req, res) => {
    const result = db.prepare('UPDATE league_match_pool SET published = 0 WHERE id = ?').run(req.params.id);
    if (result.changes === 0) throw new ApiError(404, 'not_found', 'No such entry.');
    res.status(204).end();
  })
);

// Reference list for the manual-entry form's competition dropdown.
matchesAdminRouter.get(
  '/admin/competition-types',
  ...LOW,
  asyncRoute(async (req, res) => {
    const rows = db.prepare('SELECT DISTINCT display_name FROM competition_definitions ORDER BY display_name').all();
    const fromDefs = rows.map((r, i) => ({ id: `def-${i}`, name: r.display_name, type: 'league' }));
    const fixed = [
      { id: 'friendly', name: 'International Friendly', type: 'friendly' },
      { id: 'domestic_cup', name: 'Domestic Cup', type: 'knockout' },
      { id: 'continental_cup', name: 'Continental Cup', type: 'group+knockout' },
    ];
    res.json([...fromDefs, ...fixed]);
  })
);
