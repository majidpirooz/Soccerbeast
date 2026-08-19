import { Router } from 'express';
import { asyncRoute } from '../lib/errors.js';
import { liveScoreClient } from '../services/liveScoreClient.js';
import { toTeamShape } from '../services/teamAlias.js';

export const liveRouter = Router();

const EVENT_ICON_TYPE = {
  goal: 'goal', own_goal: 'goal', penalty_goal: 'goal',
  yellow_card: 'yellow', red_card: 'red', substitution: 'sub',
};

function toEventText(ev) {
  const who = ev.player_name || '?';
  if (ev.event_type === 'substitution' && ev.extra_name) return `${who} \u2194 ${ev.extra_name}`;
  if ((ev.event_type === 'goal' || ev.event_type === 'penalty_goal') && ev.extra_name) {
    return `${who} (assist: ${ev.extra_name})`;
  }
  return who;
}

function toStatus(m) {
  if (m.is_live) return 'live';
  if (m.status_text === '\u0646\u062a\u06cc\u062c\u0647 \u0646\u0647\u0627\u06cc\u06cc') return 'finished'; // "نتیجه نهایی"
  return 'open';
}

/** toMatch / toLiveScoreMatchDetail -- exported so src/routes/matchDetail.js
 * can fall back to livescore-api for a match id that isn't in app_matches,
 * without duplicating this mapping logic (bug #2's fix). */
export function toMatch(m, includeEvents) {
  return {
    id: m.match_id,
    competition: { name: m.league_title || 'Football' },
    home: toTeamShape(m.home_team),
    away: toTeamShape(m.away_team),
    homeScore: m.home_score,
    awayScore: m.away_score,
    status: toStatus(m),
    minute: m.minute_text || m.status_text || undefined,
    kickoffLabel: m.kickoff_time_text || '',
    events: includeEvents
      ? (m.events || []).map((e, i) => ({
          id: `${m.match_id}-${i}`,
          minute: e.minute_text || '',
          type: EVENT_ICON_TYPE[e.event_type] || 'sub',
          text: toEventText(e),
        }))
      : undefined,
  };
}

export async function toLiveScoreMatchDetail(matchId) {
  const m = await liveScoreClient.getMatch(matchId);
  const match = toMatch(m, true);
  match.venue = null; // varzesh3's livescore list/detail page doesn't surface a venue name
  match.referee = null;
  match.lineups = {
    home: {
      formation: m.lineup?.host_formation || null,
      coach: m.lineup?.host_coach || null,
      players: (m.lineup?.host_starters || []).map((p) => ({ num: p.jersey_number, name: p.player_name })),
    },
    away: {
      formation: m.lineup?.away_formation || null,
      coach: m.lineup?.away_coach || null,
      players: (m.lineup?.away_starters || []).map((p) => ({ num: p.jersey_number, name: p.player_name })),
    },
  };
  match.stats = [
    ...(m.statistics?.fulltime?.length ? m.statistics.fulltime : m.statistics?.halftime || []),
  ].map((s) => ({
    label: s.stat_label,
    home: Number(String(s.home_value).replace('%', '')) || 0,
    away: Number(String(s.away_value).replace('%', '')) || 0,
    unit: String(s.home_value).includes('%') ? '%' : undefined,
  }));
  return match;
}

liveRouter.get(
  '/live',
  asyncRoute(async (req, res) => {
    // NOTE (real limitation, not a bug): livescore-api only ever knows about
    // matches it has actually scraped from varzesh3's "today" livescore page
    // during whatever window it's been running -- it has no concept of
    // arbitrary past/future dates. The frontend's day-tabs UI (yesterday/
    // today/tomorrow) can't be genuinely backed by this data source as-is;
    // `?date=` is accepted but currently ignored. See ROADMAP.md.
    const matches = await liveScoreClient.listMatches(false);

    const byLeague = new Map();
    for (const m of matches) {
      const key = m.league_title || 'Other';
      if (!byLeague.has(key)) byLeague.set(key, { id: key, name: key, matches: [] });
      byLeague.get(key).matches.push(toMatch(m, false));
    }

    let lastUpdate = null;
    try {
      const snap = await liveScoreClient.latestSnapshot();
      lastUpdate = snap.taken_at;
    } catch {
      /* snapshots/latest 404s until the first cycle completes -- fine, just no timestamp yet */
    }

    res.json({
      days: [{ id: 'today', label: 'Today', sublabel: 'Live' }],
      leagueGroups: [...byLeague.values()],
      lastUpdate,
      highlightedMatchIds: [],
    });
  })
);
