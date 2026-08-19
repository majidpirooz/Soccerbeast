import { db } from '../db/index.js';

function teamShape(id, name, crest) {
  if (!id) return null;
  return { id, name, short: name.slice(0, 2).toUpperCase(), crest };
}

/** Row shape returned by every query below (joins teams for both sides, and the arena if set). */
const SELECT_MATCH = `
  SELECT m.*, ht.name as home_name, ht.crest_path as home_crest,
         at.name as away_name, at.crest_path as away_crest,
         ar.name as arena_name
  FROM app_matches m
  JOIN teams ht ON ht.id = m.home_team_id
  JOIN teams at ON at.id = m.away_team_id
  LEFT JOIN arenas ar ON ar.id = m.arena_id
`;

const STATUS_TO_MATCH_STATUS = {
  scheduled: 'open',
  locked: 'locked',
  live: 'live',
  finished: 'finished',
};

/**
 * toMatchShape -- the general Match shape (spec section 6.10 / API_CONTRACT.md)
 * used by src/routes/home.js and src/routes/matchDetail.js. Distinct from
 * toResultEditShape below, which is the admin-only shape MatchResultEditPanel
 * expects (isKnockout + a nested normalTime/extraTime/penalties result
 * object instead of a flat homeScore/awayScore).
 */
export function toMatchShape(row) {
  return {
    id: row.id,
    competition: { name: row.competition_name, round: row.competition_round },
    home: teamShape(row.home_team_id, row.home_name, row.home_crest),
    away: teamShape(row.away_team_id, row.away_name, row.away_crest),
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: STATUS_TO_MATCH_STATUS[row.status] || 'open',
    kickoffLabel: row.kickoff_utc || '',
  };
}

export function toResultEditShape(row) {
  return {
    id: row.id,
    isKnockout: !!row.is_knockout,
    status: row.status,
    competition: { name: row.competition_name, round: row.competition_round },
    home: teamShape(row.home_team_id, row.home_name, row.home_crest),
    away: teamShape(row.away_team_id, row.away_name, row.away_crest),
    result: {
      normalTime: { home: row.normal_time_home, away: row.normal_time_away },
      ...(row.is_knockout
        ? {
            extraTime: { home: row.extra_time_home, away: row.extra_time_away },
            penalties: { home: row.penalties_home, away: row.penalties_away },
          }
        : {}),
    },
  };
}

export function toPoolCandidateShape(row, inPool) {
  return {
    id: row.id,
    home: teamShape(row.home_team_id, row.home_name, row.home_crest),
    away: teamShape(row.away_team_id, row.away_name, row.away_crest),
    competition: { name: row.competition_name },
    kickoffLabel: row.kickoff_utc || '',
    inPool,
  };
}

export function searchAppMatches(query) {
  const rows = db.prepare(`${SELECT_MATCH} WHERE m.deleted_at IS NULL ORDER BY m.kickoff_utc DESC`).all();
  const q = (query || '').toLowerCase();
  return rows
    .filter((r) => !q || `${r.home_name} ${r.away_name} ${r.competition_name}`.toLowerCase().includes(q))
    .map(toResultEditShape);
}

export function getAppMatch(id) {
  return db.prepare(`${SELECT_MATCH} WHERE m.id = ? AND m.deleted_at IS NULL`).get(id);
}

/**
 * getNextMatch / getLatestFinishedMatches -- power GET /home. There is no
 * admin-configured "hero slide" feature (API_CONTRACT.md describes one,
 * spec section 6.1 implies one exists) -- that was never built, see
 * ROADMAP.md. This is a reasonable stand-in: the soonest upcoming match and
 * the most recently finished ones, not admin-curated promotion.
 */
export function getNextMatch() {
  const row = db
    .prepare(
      `${SELECT_MATCH} WHERE m.deleted_at IS NULL AND m.status IN ('scheduled','locked')
       ORDER BY m.kickoff_utc ASC LIMIT 1`
    )
    .get();
  return row ? toMatchShape(row) : null;
}

export function getUpcomingMatches(limit = 3, excludeId = null) {
  const rows = db
    .prepare(
      `${SELECT_MATCH} WHERE m.deleted_at IS NULL AND m.status IN ('scheduled','locked')
         AND (? IS NULL OR m.id != ?)
       ORDER BY m.kickoff_utc ASC LIMIT ?`
    )
    .all(excludeId, excludeId, limit);
  return rows.map(toMatchShape);
}

export function getLatestFinishedMatches(limit = 4) {
  const rows = db
    .prepare(
      `${SELECT_MATCH} WHERE m.deleted_at IS NULL AND m.status = 'finished'
       ORDER BY m.kickoff_utc DESC LIMIT ?`
    )
    .all(limit);
  return rows.map(toMatchShape);
}
