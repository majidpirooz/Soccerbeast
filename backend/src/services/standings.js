import { db } from '../db/index.js';
import { getFootballDb } from './footballDb.js';
import { ApiError } from '../lib/errors.js';

const SNAPSHOT_MIN_AGE_HOURS = 20; // don't write a new comparison snapshot more than once/day
const COMPARISON_MIN_AGE_HOURS = 1; // don't compare against a snapshot taken moments ago

function hoursAgo(isoString) {
  return (Date.now() - new Date(isoString + 'Z').getTime()) / 36e5;
}

/**
 * Why competition_definitions exists: football.db (MatchesStatistics) has
 * no competition/season entity — just a free-text `competition` label
 * scraped per-match and a team's `country` (the Excel sheet name it came
 * from). To show "Premier League 2026-27" as one coherent standings table,
 * an admin has to tell us which country + which scraped competition label +
 * which date range that corresponds to. That mapping lives here.
 */
function getCompetitionDefinition(id) {
  const def = db.prepare('SELECT * FROM competition_definitions WHERE id = ?').get(id);
  if (!def) throw new ApiError(404, 'competition_not_found', 'No such competition.');
  return def;
}

/**
 * Reads every finished match for this competition/season from football.db.
 * Each real-world match appears as TWO rows there (one scraped from each
 * team's own "-Matches" page) sharing the same match_uid — this dedupes on
 * match_uid, keeping the lowest id, since both rows should agree on score.
 */
function loadFinishedMatches(def) {
  const fdb = getFootballDb();
  const rows = fdb
    .prepare(
      `SELECT m.id, m.match_uid, m.home_team, m.away_team, m.home_score, m.away_score,
              m.date_gregorian, m.competition, t.country
       FROM matches m
       JOIN teams t ON t.id = m.team_id
       WHERE m.status = 'finished'
         AND t.country = ?
         AND (? IS NULL OR m.competition = ?)
         AND (? IS NULL OR m.date_gregorian >= ?)
         AND (? IS NULL OR m.date_gregorian <= ?)
       ORDER BY m.date_gregorian ASC, m.id ASC`
    )
    .all(
      def.country_filter,
      def.matchstats_competition_label, def.matchstats_competition_label,
      def.season_start_date, def.season_start_date,
      def.season_end_date, def.season_end_date
    );

  const byUid = new Map();
  for (const row of rows) {
    const key = row.match_uid || `${row.home_team}|${row.away_team}|${row.date_gregorian}`;
    if (!byUid.has(key)) byUid.set(key, row);
  }
  return [...byUid.values()];
}

/** Maps football.db team-name text -> this backend's own team row, via the synced `teams` table. */
function buildTeamLookup(country) {
  const rows = db.prepare('SELECT id, name, persian_name, crest_path FROM teams WHERE country = ?').all(country);
  const byName = new Map();
  for (const t of rows) byName.set(t.name, t);
  return byName;
}

/** shapeTeam — the {id,name,short,crest} shape every route in this codebase uses, given either a synced team row or just a raw scraped name (unresolved). */
function shapeTeam(team, rawName) {
  if (team) return { id: team.id, name: team.name, short: team.name.slice(0, 2).toUpperCase(), crest: team.crest_path };
  return { id: null, name: rawName, short: rawName.slice(0, 2).toUpperCase(), crest: null };
}

function computeTable(matches, teamLookup) {
  const stats = new Map(); // team name -> accumulator

  const ensure = (name) => {
    if (!stats.has(name)) {
      stats.set(name, { name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, form: [] });
    }
    return stats.get(name);
  };

  for (const m of matches) {
    if (m.home_score == null || m.away_score == null) continue; // malformed row, skip defensively
    const home = ensure(m.home_team);
    const away = ensure(m.away_team);
    home.p++; away.p++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;

    if (m.home_score > m.away_score) { home.w++; away.l++; home.form.push('w'); away.form.push('l'); }
    else if (m.home_score < m.away_score) { away.w++; home.l++; away.form.push('w'); home.form.push('l'); }
    else { home.d++; away.d++; home.form.push('d'); away.form.push('d'); }
  }

  const table = [...stats.values()].map((s) => ({
    ...s,
    pts: s.w * 3 + s.d,
    gd: s.gf - s.ga,
    form: s.form.slice(-5), // last 5 played, chronological (matches were loaded ORDER BY date ASC)
  }));

  table.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
  table.forEach((row, i) => { row.rank = i + 1; });
  return table;
}

function getComparisonRanks(competitionDefinitionId) {
  const latest = db
    .prepare(
      `SELECT captured_at FROM standings_snapshots WHERE competition_definition_id = ?
       ORDER BY captured_at DESC LIMIT 1`
    )
    .get(competitionDefinitionId);
  if (!latest || hoursAgo(latest.captured_at) < COMPARISON_MIN_AGE_HOURS) return { ranks: new Map(), shouldWrite: !latest };

  const rows = db
    .prepare(
      `SELECT team_id, rank FROM standings_snapshots
       WHERE competition_definition_id = ? AND captured_at = ?`
    )
    .all(competitionDefinitionId, latest.captured_at);

  return {
    ranks: new Map(rows.map((r) => [r.team_id, r.rank])),
    shouldWrite: hoursAgo(latest.captured_at) >= SNAPSHOT_MIN_AGE_HOURS,
  };
}

function writeSnapshot(competitionDefinitionId, table, teamLookup) {
  const insert = db.prepare(
    `INSERT INTO standings_snapshots (competition_definition_id, team_id, rank, points) VALUES (?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    for (const row of table) {
      const team = teamLookup.get(row.name);
      if (team) insert.run(competitionDefinitionId, team.id, row.rank, row.pts);
    }
  });
  tx();
}

/** getStandings — the real implementation behind GET /competitions/:id/standings. */
export function getStandings(competitionDefinitionId) {
  const def = getCompetitionDefinition(competitionDefinitionId);
  const matches = loadFinishedMatches(def);
  const teamLookup = buildTeamLookup(def.country_filter);
  const table = computeTable(matches, teamLookup);

  const { ranks: comparisonRanks, shouldWrite } = getComparisonRanks(competitionDefinitionId);
  if (shouldWrite) writeSnapshot(competitionDefinitionId, table, teamLookup);

  return table.map((row) => {
    const team = teamLookup.get(row.name);
    const prevRank = team ? comparisonRanks.get(team.id) : undefined;
    let change = 'same';
    if (prevRank !== undefined) {
      if (row.rank < prevRank) change = 'up';
      else if (row.rank > prevRank) change = 'down';
    }
    return {
      rank: row.rank,
      change,
      team: shapeTeam(team, row.name),
      p: row.p, w: row.w, d: row.d, l: row.l, gf: row.gf, ga: row.ga, pts: row.pts,
      form: row.form,
    };
  });
}

/**
 * getFixtures — GET /competitions/:id/fixtures. football.db has no real
 * "matchday" number, only dates, so weeks here are an approximation: matches
 * bucketed into consecutive 7-day windows from the season's start date, not
 * the site's actual matchday numbering. Documented, not hidden — see
 * BACKEND_SETUP.md.
 */
export function getFixtures(competitionDefinitionId) {
  const def = getCompetitionDefinition(competitionDefinitionId);
  const fdb = getFootballDb();
  const teamLookup = buildTeamLookup(def.country_filter);

  const rows = fdb
    .prepare(
      `SELECT m.match_uid, m.home_team, m.away_team, m.home_score, m.away_score, m.status,
              m.date_gregorian, m.kickoff_time, t.country
       FROM matches m
       JOIN teams t ON t.id = m.team_id
       WHERE t.country = ?
         AND (? IS NULL OR m.competition = ?)
         AND (? IS NULL OR m.date_gregorian >= ?)
         AND (? IS NULL OR m.date_gregorian <= ?)
       ORDER BY m.date_gregorian ASC`
    )
    .all(
      def.country_filter,
      def.matchstats_competition_label, def.matchstats_competition_label,
      def.season_start_date, def.season_start_date,
      def.season_end_date, def.season_end_date
    );

  const byUid = new Map();
  for (const row of rows) {
    const key = row.match_uid || `${row.home_team}|${row.away_team}|${row.date_gregorian}`;
    if (!byUid.has(key)) byUid.set(key, row);
  }
  const deduped = [...byUid.values()];

  const seasonStart = def.season_start_date ? new Date(def.season_start_date) : deduped[0] && new Date(deduped[0].date_gregorian);
  const weeks = new Map();
  for (const m of deduped) {
    const weekNum = seasonStart && m.date_gregorian
      ? Math.max(1, Math.floor((new Date(m.date_gregorian) - seasonStart) / (7 * 86400000)) + 1)
      : 1;
    const weekId = `w${weekNum}`;
    if (!weeks.has(weekId)) weeks.set(weekId, { id: weekId, label: `Week ${weekNum}`, fixtures: [] });

    const home = teamLookup.get(m.home_team);
    const away = teamLookup.get(m.away_team);
    weeks.get(weekId).fixtures.push({
      id: m.match_uid,
      time: m.kickoff_time || '',
      home: shapeTeam(home, m.home_team),
      away: shapeTeam(away, m.away_team),
      score: m.status === 'finished' ? `${m.home_score}\u2013${m.away_score}` : 'VS',
    });
  }

  return [...weeks.values()];
}
