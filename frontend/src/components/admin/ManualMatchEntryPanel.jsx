import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import TextField from '../ui/TextField';
import SelectField from '../ui/SelectField';
import Button from '../ui/Button';

/**
 * ManualMatchEntryPanel — spec §2.4 / §6.11 item 3. For anything
 * MatchesStatistics doesn't structurally cover: domestic cups, UEFA
 * competitions, international friendlies. Both Top Tier and Low Tier
 * Admin can use this (spec doesn't restrict it to Top Tier).
 *
 * `linkCount` lets admin add multiple live-watch links per match (spec
 * explicitly allows more than one).
 */
export default function ManualMatchEntryPanel({ competitions = [], onSubmit }) {
  const [form, setForm] = useState({
    competitionId: competitions[0]?.id || '',
    homeTeam: '',
    awayTeam: '',
    kickoff: '',
    arena: '',
    reasonTag: 'group_stage',
    watchLinks: [''],
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setLink = (i, value) =>
    setForm((f) => ({ ...f, watchLinks: f.watchLinks.map((l, idx) => (idx === i ? value : l)) }));
  const addLink = () => setForm((f) => ({ ...f, watchLinks: [...f.watchLinks, ''] }));

  return (
    <SectionCard
      title="Manual Match Entry"
      description="For cup, knockout, group, and friendly matches outside the auto-sourced leagues."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField
          label="Competition"
          value={form.competitionId}
          onChange={(e) => set({ competitionId: e.target.value })}
          options={competitions.map((c) => ({ value: c.id, label: c.name }))}
        />
        <SelectField
          label="Reason tag"
          value={form.reasonTag}
          onChange={(e) => set({ reasonTag: e.target.value })}
          options={[
            { value: 'friendly', label: 'Friendly' },
            { value: 'knockout_round', label: 'Knockout Round' },
            { value: 'group_stage', label: 'Group Stage' },
          ]}
        />
        <TextField label="Home team" value={form.homeTeam} onChange={(e) => set({ homeTeam: e.target.value })} />
        <TextField label="Away team" value={form.awayTeam} onChange={(e) => set({ awayTeam: e.target.value })} />
        <TextField
          label="Kickoff time"
          type="datetime-local"
          value={form.kickoff}
          onChange={(e) => set({ kickoff: e.target.value })}
        />
        <TextField
          label="Arena"
          value={form.arena}
          onChange={(e) => set({ arena: e.target.value })}
          hint="Defaults to the home team's registered arena if left blank."
        />
      </div>

      <div className="mt-3.5">
        <span className="block text-[11.5px] font-bold text-textDim mb-1.5">Live-watch link(s)</span>
        <div className="flex flex-col gap-2">
          {form.watchLinks.map((link, i) => (
            <TextField key={i} placeholder="https://…" value={link} onChange={(e) => setLink(i, e.target.value)} />
          ))}
        </div>
        <button onClick={addLink} className="text-[11.5px] font-bold text-diamond mt-2">
          + Add another link
        </button>
      </div>

      <Button className="mt-4" onClick={() => onSubmit?.(form)}>
        Save Match
      </Button>
    </SectionCard>
  );
}
