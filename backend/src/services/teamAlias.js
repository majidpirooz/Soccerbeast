import { db } from '../db/index.js';

/**
 * resolveTeamName — looks up a raw team-name string (as scraped by
 * livescore-api, Farsi or English) against team_aliases. Three outcomes:
 *   - known + resolved  → returns the canonical team row
 *   - known + unresolved → returns null (already flagged, don't re-flag)
 *   - never seen before  → inserts an unresolved alias row, returns null
 * This is what feeds the "Unmatched Team Names" admin panel (spec §4.1) —
 * every distinct string that's ever hit the `else` branch below shows up
 * there until an admin resolves it.
 */
export function resolveTeamName(rawText, source = 'livescore_api') {
  if (!rawText) return null;

  const alias = db.prepare('SELECT * FROM team_aliases WHERE raw_text = ?').get(rawText);
  if (alias?.team_id) {
    return db.prepare('SELECT * FROM teams WHERE id = ?').get(alias.team_id) || null;
  }
  if (!alias) {
    const language = /[\u0600-\u06FF]/.test(rawText) ? 'fa' : 'en';
    db.prepare('INSERT INTO team_aliases (raw_text, source, language) VALUES (?, ?, ?)').run(rawText, source, language);
  }
  return null;
}

/** toTeamShape — Match.home/Match.away shape, falling back to the raw scraped name when unresolved. */
export function toTeamShape(rawText) {
  const team = resolveTeamName(rawText);
  if (team) {
    return { id: team.id, name: team.name, short: team.name.slice(0, 2).toUpperCase(), crest: team.crest_path };
  }
  return rawText ? { id: null, name: rawText, short: rawText.slice(0, 2).toUpperCase(), crest: null } : null;
}
