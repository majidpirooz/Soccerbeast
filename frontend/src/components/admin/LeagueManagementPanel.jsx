import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import TextField from '../ui/TextField';
import Button from '../ui/Button';

/**
 * LeagueManagementPanel — spec §6.11 item 6 / §7.6.
 *
 * `role`: 'top' | 'low'. Top Tier can see and manage every league; Low
 * Tier only sees/manages leagues they themselves created (filter the
 * `leagues` prop before passing it in — this component doesn't do the
 * filtering itself since "which leagues belong to me" is a data-layer
 * question).
 *
 * Main League can never be finished/deleted (spec §7.6) — its row's
 * "Finish League" action is omitted rather than disabled, to avoid an
 * inert-looking button.
 */
export default function LeagueManagementPanel({
  role = 'top',
  leagues = [],
  onCreateLeague,
  onFinishLeague,
  onToggleMember,
  onRegenerateCode,
}) {
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  return (
    <SectionCard
      title="Prediction Leagues"
      tag={role === 'top' ? <Tag variant="gold">Top Tier: all leagues</Tag> : <Tag variant="diamond">Low Tier: your leagues</Tag>}
      description="Invitation codes are permanently retired once a league finishes or is deleted — never reused, even by a future league with the same name."
    >
      <div className="flex gap-2 mb-4">
        <TextField placeholder="New league name…" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <Button onClick={() => { onCreateLeague?.(newName); setNewName(''); }}>Create League</Button>
      </div>

      <div className="flex flex-col gap-2">
        {leagues.map((l) => (
          <div key={l.id} className="border border-lineSoft rounded-xl">
            <button
              onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
              className="w-full flex items-center gap-3 px-3.5 py-3 flex-wrap text-left"
            >
              <span className="font-bold text-[13px] flex-1">{l.name}</span>
              {l.id === 'main' && <Tag variant="gold">Main League</Tag>}
              <Tag variant={l.status === 'active' ? 'win' : 'neutral'}>{l.status}</Tag>
              <span className="text-[11px] text-textMute">{l.members} members</span>
            </button>

            {expandedId === l.id && (
              <div className="px-3.5 pb-3.5 border-t border-lineSoft pt-3 flex flex-wrap items-center gap-2.5">
                <div className="text-[11.5px] text-textMute">
                  Invitation code: <b className="text-text font-display tracking-wide">{l.code}</b>
                </div>
                <Button variant="ghost" onClick={() => onRegenerateCode?.(l)}>Regenerate Code</Button>
                <Button variant="ghost" onClick={() => onToggleMember?.(l)}>Manage Members</Button>
                {l.id !== 'main' && l.status === 'active' && (
                  <Button variant="ghost" onClick={() => onFinishLeague?.(l)}>Finish League</Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
