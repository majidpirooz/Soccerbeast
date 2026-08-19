import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncRoute, ApiError } from '../lib/errors.js';
import { getAppMatch, toMatchShape } from '../services/appMatches.js';
import { toLiveScoreMatchDetail } from './live.js';

export const matchDetailRouter = Router();

/**
 * GET /matches/:id -- bug #2's fix. Before this, the only handler for this
 * path lived in live.js and unconditionally called livescore-api, which is
 * wrong for any match id that actually belongs to app_matches (manually
 * entered matches, or anything reached from the Prediction/Leagues pages).
 *
 * Tries app_matches first (cheap local lookup), falls back to livescore-api.
 * This is a pragmatic disambiguation, not a proven-safe one -- app_matches
 * ids and livescore-api's own match ids are both small integers from
 * unrelated sequences, so a genuine id collision between the two sources
 * is possible in theory (an app_matches row with id=42 and an unrelated
 * livescore-api match also assigned id=42 would resolve to the app_matches
 * one, silently). Spec section 4.2's kickoff-time+team matching would
 * remove this ambiguity by linking the two properly (via the
 * app_matches.livescore_match_id column that already exists in the schema
 * but nothing populates yet) -- see ROADMAP.md, this is the same known gap
 * flagged there for the Live page's "highlighted" matches feature.
 */
matchDetailRouter.get(
  '/matches/:id',
  asyncRoute(async (req, res) => {
    const appRow = /^\d+$/.test(req.params.id) ? getAppMatch(req.params.id) : null;
    if (appRow) {
      const match = toMatchShape(appRow);
      match.venue = appRow.arena_name || null;
      match.referee = null; // not captured anywhere for manually entered matches
      match.lineups = { home: { formation: null, coach: null, players: [] }, away: { formation: null, coach: null, players: [] } };
      match.stats = [];

      // If this app match has actually been linked to a livescore-api match
      // (see the doc comment above -- nothing sets this yet, but the column
      // and the fallback both already exist so it works the moment
      // something does), enrich with live lineups/stats/events instead of
      // the empty placeholders above.
      if (appRow.livescore_match_id) {
        try {
          const liveDetail = await toLiveScoreMatchDetail(appRow.livescore_match_id);
          match.lineups = liveDetail.lineups;
          match.stats = liveDetail.stats;
          match.events = liveDetail.events;
        } catch {
          /* livescore-api unreachable or match not found there -- keep the placeholders, not a hard failure */
        }
      }

      return res.json(match);
    }

    try {
      const match = await toLiveScoreMatchDetail(req.params.id);
      return res.json(match);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(404, 'match_not_found', 'No such match.');
    }
  })
);
