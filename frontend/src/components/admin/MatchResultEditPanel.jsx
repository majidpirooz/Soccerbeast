import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import Crest from '../ui/Crest';
import Button from '../ui/Button';

/**
 * ScorePair — one home/away numeric input pair, reused for each of the
 * (up to) three result stages a knockout match can have.
 */
function ScorePair({ label, value, onChange }) {
  return (
    <div>
      <span className="block text-[11px] text-textMute mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={value.home}
          onChange={(e) => onChange({ ...value, home: e.target.value })}
          className="w-[42px] h-[42px] rounded-[9px] bg-surface2 border border-line text-center font-display text-lg focus:outline-none focus:border-gold"
        />
        <span className="text-textMute font-extrabold">–</span>
        <input
          type="number"
          min="0"
          value={value.away}
          onChange={(e) => onChange({ ...value, away: e.target.value })}
          className="w-[42px] h-[42px] rounded-[9px] bg-surface2 border border-line text-center font-display text-lg focus:outline-none focus:border-gold"
        />
      </div>
    </div>
  );
}

/**
 * MatchResultEditPanel — spec §9 / §6.11: "Manual result correction: edit
 * a match's actual result after it's finished; for knockout-stage matches,
 * edit normal time / extra time / penalties as three separate fields" and
 * "Delete a match, even after publication or after it's finished."
 *
 * Both actions are available regardless of match status (finished,
 * published, whatever) — the spec is explicit that these don't lock like
 * ordinary prediction-facing edits do.
 *
 * `match.isKnockout` switches between a single score-pair (league/group
 * matches) and three independent score-pairs (knockout matches: normal
 * time, extra time, penalties — extra time and penalties only apply if
 * the tie actually went there, so they're optional/blank-able, not
 * required).
 */
export default function MatchResultEditPanel({ match, onSaveResult, onDeleteMatch }) {
  const [normalTime, setNormalTime] = useState(match.result?.normalTime || { home: '', away: '' });
  const [extraTime, setExtraTime] = useState(match.result?.extraTime || { home: '', away: '' });
  const [penalties, setPenalties] = useState(match.result?.penalties || { home: '', away: '' });
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSave = () => {
    if (match.isKnockout) {
      onSaveResult?.(match.id, { normalTime, extraTime, penalties });
    } else {
      onSaveResult?.(match.id, { normalTime });
    }
  };

  return (
    <SectionCard
      title="Edit Result"
      tag={match.isKnockout ? <Tag variant="diamond">Knockout — 3 fields</Tag> : <Tag variant="neutral">League match</Tag>}
      description="Available regardless of match status — publication or finished state doesn't lock this."
    >
      <div className="flex items-center gap-2.5 mb-4 text-[13px] font-bold">
        <Crest team={match.home} size="sm" /> {match.home?.name} vs {match.away?.name} <Crest team={match.away} size="sm" />
      </div>

      <div className="flex flex-wrap gap-5">
        <ScorePair label="Normal Time" value={normalTime} onChange={setNormalTime} />
        {match.isKnockout && (
          <>
            <ScorePair label="Extra Time (if played)" value={extraTime} onChange={setExtraTime} />
            <ScorePair label="Penalties (if played)" value={penalties} onChange={setPenalties} />
          </>
        )}
      </div>

      <div className="flex items-center gap-2.5 mt-4.5 pt-4 border-t border-lineSoft">
        <Button onClick={handleSave}>Save Result</Button>

        {!confirmingDelete ? (
          <button onClick={() => setConfirmingDelete(true)} className="text-[12px] font-bold text-loss ms-auto">
            Delete Match
          </button>
        ) : (
          <div className="flex items-center gap-2 ms-auto text-[12px]">
            <span className="text-textMute">Delete permanently — cannot be undone.</span>
            <button onClick={() => setConfirmingDelete(false)} className="font-bold text-textDim">
              Cancel
            </button>
            <button
              onClick={() => {
                onDeleteMatch?.(match.id);
                setConfirmingDelete(false);
              }}
              className="font-bold text-loss"
            >
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
