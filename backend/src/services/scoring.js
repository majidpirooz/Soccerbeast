import { db } from '../db/index.js';

/** pointsForPrediction — spec section 7.1's table, as a pure function so it's independently testable. */
export function pointsForPrediction(predictedHome, predictedAway, actualHome, actualAway) {
  if (predictedHome == null || predictedAway == null || actualHome == null || actualAway == null) return 0;
  if (predictedHome === actualHome && predictedAway === actualAway) return 10; // exact
  const predictedGD = predictedHome - predictedAway;
  const actualGD = actualHome - actualAway;
  const predictedWinner = Math.sign(predictedGD); // -1 away, 0 draw, 1 home
  const actualWinner = Math.sign(actualGD);
  if (predictedWinner !== actualWinner) return 2; // wrong
  if (predictedGD === actualGD) return 7; // correct winner + correct GD
  return 5; // correct winner only
}

/** outcomeKind — which bucket a score belongs to, for the leaderboard's count columns. */
function outcomeKind(points) {
  if (points === 10) return 'exact';
  if (points === 7) return 'winnerGD';
  if (points === 5) return 'winnerOnly';
  if (points === 2) return 'wrong';
  return 'none';
}

/**
 * scoreUserPredictionsForMatch — spec section 7.4: Combined mode submits up
 * to 2 picks per match; the user is credited the HIGHER of the two picks'
 * point values (not summed), and that higher-scoring pick is the one shown
 * as their "official" pick.
 */
function scoreUserPredictionsForMatch(picks, actualHome, actualAway) {
  if (!picks.length) return { points: 0, kind: 'none', officialPick: null };
  let best = null;
  for (const p of picks) {
    const points = pointsForPrediction(p.predicted_home, p.predicted_away, actualHome, actualAway);
    if (!best || points > best.points) best = { points, kind: outcomeKind(points), officialPick: p };
  }
  return best;
}

/**
 * computeWeekStats — per-user totals for one league+week, plus trophy
 * awards, following the full tie-break chain in spec section 7.3.
 * `weekLabel` matches league_match_pool.week_label (Week is an admin-defined
 * grouping for pool purposes, per spec section 7.5 -- not recomputed from
 * kickoff dates here, the pool grouping IS the week).
 */
export function computeWeekStats(leagueId, weekLabel) {
  const matches = db
    .prepare(
      `SELECT m.id, m.home_score, m.away_score, m.status FROM league_match_pool lmp
       JOIN app_matches m ON m.id = lmp.match_id
       WHERE lmp.league_id = ? AND lmp.week_label = ? AND lmp.published = 1 AND m.deleted_at IS NULL`
    )
    .all(leagueId, weekLabel);
  const finishedMatches = matches.filter((m) => m.status === 'finished');
  const matchCount = matches.length;
  const diamondThreshold = Math.ceil(matchCount * 0.5);

  const members = db.prepare('SELECT user_id FROM league_memberships WHERE league_id = ?').all(leagueId);

  const perUser = new Map();
  for (const { user_id } of members) {
    perUser.set(user_id, { userId: user_id, points: 0, exact: 0, winnerGD: 0, winnerOnly: 0, wrong: 0, submitted: 0 });
  }

  for (const match of finishedMatches) {
    const picksByUser = new Map();
    const rows = db.prepare('SELECT * FROM predictions WHERE league_id = ? AND match_id = ?').all(leagueId, match.id);
    for (const row of rows) {
      if (!picksByUser.has(row.user_id)) picksByUser.set(row.user_id, []);
      picksByUser.get(row.user_id).push(row);
    }

    for (const [userId, picks] of picksByUser) {
      if (!perUser.has(userId)) perUser.set(userId, { userId, points: 0, exact: 0, winnerGD: 0, winnerOnly: 0, wrong: 0, submitted: 0 });
      const { points, kind } = scoreUserPredictionsForMatch(picks, match.home_score, match.away_score);
      const u = perUser.get(userId);
      u.points += points;
      u.submitted += 1;
      if (kind === 'exact') u.exact++;
      else if (kind === 'winnerGD') u.winnerGD++;
      else if (kind === 'winnerOnly') u.winnerOnly++;
      else if (kind === 'wrong') u.wrong++;
    }
  }

  const users = [...perUser.values()].map((u) => ({
    ...u,
    diamond: matchCount > 0 && u.exact >= diamondThreshold,
  }));

  // Golden Trophy tie-break chain, spec section 7.3 steps 1-6.
  const maxPoints = Math.max(0, ...users.map((u) => u.points));
  let contenders = users.filter((u) => u.points === maxPoints && maxPoints > 0);
  if (contenders.length > 1) {
    const diamondHolders = contenders.filter((u) => u.diamond);
    if (diamondHolders.length > 0) {
      contenders = diamondHolders; // step 1
    } else {
      const maxExact = Math.max(...contenders.map((u) => u.exact));
      let step2 = contenders.filter((u) => u.exact === maxExact);
      if (step2.length > 1) {
        // Step 3 per spec: "highest COMBINED count of (correct winner + correct GD)" --
        // i.e. the winnerGD bucket count (exact predictions are already their own bucket).
        const maxCombined = Math.max(...step2.map((u) => u.winnerGD));
        let step3 = step2.filter((u) => u.winnerGD === maxCombined);
        if (step3.length > 1) {
          const maxWinnerOnly = Math.max(...step3.map((u) => u.winnerOnly));
          let step4 = step3.filter((u) => u.winnerOnly === maxWinnerOnly);
          if (step4.length > 1) {
            const maxSubmitted = Math.max(...step4.map((u) => u.submitted));
            step4 = step4.filter((u) => u.submitted === maxSubmitted);
          }
          step3 = step4;
        }
        step2 = step3;
      }
      contenders = step2;
    }
  }
  const goldenUserIds = new Set(contenders.map((u) => u.userId));

  return users.map((u) => ({ ...u, golden: goldenUserIds.has(u.userId) }));
}

/**
 * computeSeasonLeaderboard — sums every week's stats for a league. Season
 * tiebreak per spec section 7.3 ("both Golden and Diamond Trophy count are
 * used as tiebreakers in the overall leaderboard") -- the spec doesn't
 * state which of the two takes priority over the other, so this picks
 * Golden-then-Diamond as a documented default; swap the two comparator
 * lines below if the real intent turns out to be the other order.
 */
export function computeSeasonLeaderboard(leagueId) {
  const weekLabels = db
    .prepare('SELECT DISTINCT week_label FROM league_match_pool WHERE league_id = ? AND week_label IS NOT NULL')
    .all(leagueId)
    .map((r) => r.week_label);

  const totals = new Map();
  for (const week of weekLabels) {
    const weekStats = computeWeekStats(leagueId, week);
    for (const u of weekStats) {
      if (!totals.has(u.userId)) {
        totals.set(u.userId, { userId: u.userId, points: 0, exact: 0, winnerGD: 0, winnerOnly: 0, wrong: 0, golden: 0, diamond: 0 });
      }
      const t = totals.get(u.userId);
      t.points += u.points;
      t.exact += u.exact;
      t.winnerGD += u.winnerGD;
      t.winnerOnly += u.winnerOnly;
      t.wrong += u.wrong;
      if (u.golden) t.golden += 1;
      if (u.diamond) t.diamond += 1;
    }
  }

  const rows = [...totals.values()].sort(
    (a, b) => b.points - a.points || b.golden - a.golden || b.diamond - a.diamond || b.exact - a.exact
  );
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

/**
 * getLeaderboardWithRankChange — wraps computeSeasonLeaderboard with the
 * same snapshot-comparison pattern src/services/standings.js uses, so both
 * leaderboards (team standings and prediction leaderboard) behave
 * consistently: compare against a snapshot at least 1h old, write a new one
 * at most once per ~20h.
 */
const SNAPSHOT_MIN_AGE_HOURS = 20;
const COMPARISON_MIN_AGE_HOURS = 1;

function hoursAgo(isoString) {
  return (Date.now() - new Date(isoString + 'Z').getTime()) / 36e5;
}

export function getLeaderboardWithRankChange(leagueId) {
  const rows = computeSeasonLeaderboard(leagueId);

  const latest = db
    .prepare('SELECT captured_at FROM leaderboard_snapshots WHERE league_id = ? ORDER BY captured_at DESC LIMIT 1')
    .get(leagueId);

  let comparisonRanks = new Map();
  let shouldWrite = !latest;
  if (latest && hoursAgo(latest.captured_at) >= COMPARISON_MIN_AGE_HOURS) {
    const snapshotRows = db
      .prepare('SELECT user_id, rank FROM leaderboard_snapshots WHERE league_id = ? AND captured_at = ?')
      .all(leagueId, latest.captured_at);
    comparisonRanks = new Map(snapshotRows.map((r) => [r.user_id, r.rank]));
    shouldWrite = hoursAgo(latest.captured_at) >= SNAPSHOT_MIN_AGE_HOURS;
  }

  if (shouldWrite && rows.length) {
    const insert = db.prepare('INSERT INTO leaderboard_snapshots (league_id, user_id, rank, points) VALUES (?, ?, ?, ?)');
    const tx = db.transaction(() => rows.forEach((r) => insert.run(leagueId, r.userId, r.rank, r.points)));
    tx();
  }

  return rows.map((r) => {
    const prevRank = comparisonRanks.get(r.userId);
    let change = 'same';
    if (prevRank !== undefined) {
      if (r.rank < prevRank) change = 'up';
      else if (r.rank > prevRank) change = 'down';
    }
    return { ...r, change };
  });
}
