import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncRoute } from '../lib/errors.js';

export const stringsRouter = Router();

/**
 * GET /strings -- public (no auth), the fix for bug #3's missing piece:
 * `admin/strings.js`'s GET requires Top Tier auth, which is correct for the
 * *editor* but means the actual site (every visitor, signed in or not)
 * never had any way to fetch translated text at all.
 *
 * Shape is deliberately different from GET /admin/strings: this returns a
 * key-indexed dictionary `{ [key]: {en, fa} }` for O(1) lookup by the
 * frontend's t() function, not the array-of-rows shape the String Editor's
 * table needs for iteration + editing. Same underlying table, two shapes
 * for two different consumers.
 */
stringsRouter.get(
  '/strings',
  asyncRoute(async (req, res) => {
    const rows = db.prepare('SELECT key, en, fa FROM ui_strings').all();
    const dict = {};
    for (const r of rows) dict[r.key] = { en: r.en, fa: r.fa };
    res.json(dict);
  })
);
