import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import SelectField from '../ui/SelectField';
import TextField from '../ui/TextField';
import Crest from '../ui/Crest';
import Tag from '../ui/Tag';
import Button from '../ui/Button';

/**
 * MatchPoolPickerPanel — the "which matches go into a league's prediction
 * pool" half of match-pool management. The spec's §6.11 bullet only names
 * the review/unpublish side explicitly ("Selected Matches admin view (so
 * admin can review/unpublish already-published matches)") — the picker
 * itself isn't detailed further, so this fills that gap with the simplest
 * reasonable shape: pick a league + week, browse candidate matches
 * (already fixtured via MatchesStatistics/football-data.org/manual entry,
 * not yet in that league's pool), multi-select, publish.
 *
 * `candidates`: [{ id, home, away, competition, kickoffLabel, inPool: boolean }]
 * — `inPool` lets the list show what's already added so admin isn't
 * guessing. Matches already in the pool are shown but disabled, since
 * removing them is `SelectedMatchesPanel`'s job (unpublish), not this
 * panel's — keeps the two responsibilities from overlapping.
 *
 * League/week selection can be controlled from outside via `leagueId` /
 * `weekId` / `onLeagueChange` / `onWeekChange` — needed so a container can
 * refetch `candidates` for whichever league+week is selected (the panel
 * has no way to fetch on its own, it just renders what it's given). Falls
 * back to internal state when those aren't supplied, so it still works
 * standalone with a static `candidates` list.
 */
export default function MatchPoolPickerPanel({
  leagues = [],
  weeks = [],
  candidates = [],
  onPublish,
  leagueId: controlledLeagueId,
  weekId: controlledWeekId,
  onLeagueChange,
  onWeekChange,
}) {
  const [internalLeagueId, setInternalLeagueId] = useState(leagues[0]?.id || '');
  const [internalWeekId, setInternalWeekId] = useState(weeks[0]?.id || '');
  const leagueId = controlledLeagueId ?? internalLeagueId;
  const weekId = controlledWeekId ?? internalWeekId;
  const setLeagueId = (id) => (onLeagueChange ? onLeagueChange(id) : setInternalLeagueId(id));
  const setWeekId = (id) => (onWeekChange ? onWeekChange(id) : setInternalWeekId(id));

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);

  const filtered = candidates.filter(
    (m) =>
      `${m.home.name} ${m.away.name} ${m.competition?.name}`.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <SectionCard
      title="Add Matches to Prediction Pool"
      description="Choose a league and week, then select matches to publish for prediction."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
        <SelectField
          label="League"
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          options={leagues.map((l) => ({ value: l.id, label: l.name }))}
        />
        <SelectField
          label="Week"
          value={weekId}
          onChange={(e) => setWeekId(e.target.value)}
          options={weeks.map((w) => ({ value: w.id, label: w.label }))}
        />
      </div>

      <TextField placeholder="Search matches…" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />

      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto mb-4">
        {filtered.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] ${
              m.inPool ? 'opacity-40' : 'hover:bg-surface2 cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              disabled={m.inPool}
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
              className="accent-gold"
            />
            <Crest team={m.home} size="sm" />
            <span className="font-semibold">
              {m.home.name} vs {m.away.name}
            </span>
            <span className="text-textMute text-[11px] ms-auto">{m.competition?.name} · {m.kickoffLabel}</span>
            {m.inPool && <Tag variant="win">In pool</Tag>}
          </label>
        ))}
      </div>

      <Button disabled={!selected.length} onClick={() => onPublish?.({ leagueId, weekId, matchIds: selected })}>
        Publish {selected.length || ''} Match{selected.length === 1 ? '' : 'es'} to Pool
      </Button>
    </SectionCard>
  );
}
