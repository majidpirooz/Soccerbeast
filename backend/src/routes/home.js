import { Router } from 'express';
import { asyncRoute } from '../lib/errors.js';
import { getNextMatch, getUpcomingMatches, getLatestFinishedMatches } from '../services/appMatches.js';

export const homeRouter = Router();

/**
 * GET /home -- spec section 6.1 / API_CONTRACT.md. This route genuinely did
 * not exist before (bug #1 from the pre-deployment review) -- the frontend's
 * HomePageContainer called it on every load and would have 404'd immediately.
 *
 * `heroMatch`/`miniMatches` are documented in API_CONTRACT.md as reflecting
 * "whatever Top Tier Admin has configured as slides" -- that admin feature
 * was never built (no slides table, no admin panel for it). This route
 * fills the same response shape with the soonest upcoming match as the
 * hero and a few other upcoming matches as the mini-row, which is a
 * reasonable stand-in but is NOT the admin-curated feature the contract
 * describes. Flagged in ROADMAP.md, not silently pretended to be finished.
 *
 * On a fresh/empty database, heroMatch and nextMatch can both be null --
 * HomePage.jsx has been given a guard for that (see that file's own note).
 */
homeRouter.get(
  '/home',
  asyncRoute(async (req, res) => {
    const nextMatch = getNextMatch();
    const miniMatches = nextMatch ? getUpcomingMatches(3, nextMatch.id) : getUpcomingMatches(3);
    const latestMatches = getLatestFinishedMatches(4);

    // No real hero-slide concept exists yet (see note above) -- fall back to
    // the next match, or the most recent finished one if nothing's upcoming.
    const heroMatch = nextMatch || latestMatches[0] || null;

    res.json({ heroMatch, miniMatches, nextMatch, latestMatches });
  })
);
