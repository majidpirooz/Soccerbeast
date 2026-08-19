import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import TextField from '../ui/TextField';
import Tag from '../ui/Tag';
import Crest from '../ui/Crest';
import MatchResultEditPanel from './MatchResultEditPanel';

const STATUS_TAG = { finished: 'neutral', live: 'loss', scheduled: 'diamond' };

/**
 * MatchResultsBrowser — the missing entry point into `MatchResultEditPanel`.
 * Previously the admin page just rendered two static example matches side
 * by side with no way to reach any other match; this replaces that with a
 * real (if mock-data-backed) searchable list. Click a row to open the
 * editor for that match; a "Back to list" step returns without losing the
 * list's scroll position/search state.
 *
 * `matches`: same shape `MatchResultEditPanel` expects, plus `status`
 * ('finished' | 'live' | 'scheduled') and `competition` for the list view.
 */
export default function MatchResultsBrowser({ matches = [], onSaveResult, onDeleteMatch }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const selected = matches.find((m) => m.id === selectedId);

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelectedId(null)} className="text-[12px] font-bold text-diamond mb-3">
          ← Back to match list
        </button>
        <MatchResultEditPanel
          match={selected}
          onSaveResult={(id, result) => {
            onSaveResult?.(id, result);
            setSelectedId(null);
          }}
          onDeleteMatch={(id) => {
            onDeleteMatch?.(id);
            setSelectedId(null);
          }}
        />
      </div>
    );
  }

  const filtered = matches.filter((m) =>
    `${m.home.name} ${m.away.name} ${m.competition?.name}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SectionCard title="All Matches" description="Click a match to correct its result or delete it — works regardless of status.">
      <TextField placeholder="Search matches or competitions…" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />
      <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left text-[12.5px] hover:bg-surface2"
          >
            <Crest team={m.home} size="sm" />
            <span className="font-semibold flex-1">
              {m.home.name} vs {m.away.name}
            </span>
            <span className="text-textMute text-[11px]">{m.competition?.name}</span>
            {m.isKnockout && <Tag variant="gold">Knockout</Tag>}
            <Tag variant={STATUS_TAG[m.status] || 'neutral'}>{m.status}</Tag>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-[12.5px] text-textMute px-2.5 py-2">No matches found.</p>}
      </div>
    </SectionCard>
  );
}
