import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncRoute, ApiError } from '../lib/errors.js';
import { optionalAuth } from '../middleware/requireAuth.js';

export const contactRouter = Router();

/**
 * POST /contact-admin -- the fix for "Message To Administrator does
 * nothing" (the footer link previously called a plain console.log on the
 * frontend). Works signed-in or signed-out (optionalAuth), just persists
 * the message. There is no admin inbox UI reading these yet -- see
 * ROADMAP.md -- so this is "no longer a no-op", not "fully built feature".
 */
contactRouter.post(
  '/contact-admin',
  optionalAuth,
  asyncRoute(async (req, res) => {
    const { message } = req.body || {};
    if (!message || !message.trim()) throw new ApiError(400, 'missing_message', 'A message is required.');

    db.prepare('INSERT INTO admin_messages (user_id, message) VALUES (?, ?)').run(req.user?.id || null, message.trim());
    res.status(201).json({ ok: true });
  })
);
