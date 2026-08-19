import { useState } from 'react';
import Crest from '../ui/Crest';
import Pill from '../ui/Pill';
import Button from '../ui/Button';
import { useT } from '../../context/I18nContext';

/**
 * PredictionCard — one match's prediction entry (spec §6.9 / §7.4).
 *
 * mode: 'normal' (single score input) | 'combined' (two inputs, the higher
 * of the two scores' point values counts, per spec §7.4).
 *
 * `initial` / `initial2`: { home, away } prefilled scores, if the user (or
 * an admin, on their behalf) already has a pick. `enteredByAdmin` renders
 * the required disclosure per spec §6.9 / §6.11.
 */
export default function PredictionCard({
  match,
  mode = 'normal',
  initial,
  initial2,
  enteredByAdmin = false,
  onSave,
}) {
  const t = useT();
  const [p1, setP1] = useState(initial || { home: '', away: '' });
  const [p2, setP2] = useState(initial2 || { home: '', away: '' });

  const handleSave = () => {
    if (mode === 'combined') {
      onSave?.(match, [p1, p2]);
    } else {
      onSave?.(match, [p1]);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-card p-3.5">
      {mode === 'combined' && (
        <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-diamond bg-diamond/10 px-2 py-1 rounded-md mb-2">
          ◆ {t('prediction.combinedMode', 'Combined Mode — best of 2 picks counts')}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="text-[11.5px] font-bold text-textDim">{match.competition?.name}</div>
        <Pill status={match.status} />
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex-1 flex items-center gap-2.5">
          <Crest team={match.home} size="md" />
          <span className="text-[13.5px] font-bold">{match.home?.name}</span>
        </div>
        <div className="text-[11px] text-textMute font-bold">{match.kickoffLabel}</div>
        <div className="flex-1 flex items-center gap-2.5 flex-row-reverse text-end">
          <Crest team={match.away} size="md" />
          <span className="text-[13.5px] font-bold">{match.away?.name}</span>
        </div>
      </div>

      <ScoreInputRow value={p1} onChange={setP1} />
      {mode === 'combined' && <ScoreInputRow value={p2} onChange={setP2} />}

      <Button className="w-full mt-1" onClick={handleSave}>
        {mode === 'combined' ? t('prediction.saveBothPredictions', 'Save Both Predictions') : t('prediction.savePrediction', 'Save Prediction')}
      </Button>

      {enteredByAdmin && (
        <div className="text-[10.5px] text-textMute text-center mt-2 italic">
          {t('prediction.enteredByAdmin', 'This pick was entered by admin on your behalf')}
        </div>
      )}
    </div>
  );
}

function ScoreInputRow({ value, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2.5 my-3.5 rtl:flex-row-reverse">
      <input
        type="number"
        min="0"
        value={value.home}
        onChange={(e) => onChange({ ...value, home: e.target.value })}
        className="w-[46px] h-[46px] rounded-[10px] bg-surface2 border border-line text-center font-display text-xl
          focus:outline-none focus:border-gold"
      />
      <span className="text-textMute font-extrabold">–</span>
      <input
        type="number"
        min="0"
        value={value.away}
        onChange={(e) => onChange({ ...value, away: e.target.value })}
        className="w-[46px] h-[46px] rounded-[10px] bg-surface2 border border-line text-center font-display text-xl
          focus:outline-none focus:border-gold"
      />
    </div>
  );
}
