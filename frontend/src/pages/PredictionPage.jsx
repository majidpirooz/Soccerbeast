import TrophyIcon from '../components/ui/TrophyIcon';
import Pill from '../components/ui/Pill';
import Leaderboard from '../components/prediction/Leaderboard';
import PredictionCard from '../components/prediction/PredictionCard';
import { useT } from '../context/I18nContext';

/**
 * PredictionPage — spec §6.9. `predictionLeagues`: [{ id, name }] for the
 * league-selector tabs (a user can belong to more than one, per §3 entity
 * model). `matchesToPredict`: [{ match, mode, initial, initial2, enteredByAdmin }].
 */
export default function PredictionPage({
  predictionLeagues = [],
  activeLeagueId,
  onSelectLeague,
  leaderboardRows = [],
  lockLabel,
  matchesToPredict = [],
  onSavePrediction,
}) {
  const t = useT();
  return (
    <div>
      <div className="max-w-[1120px] mx-auto px-4 pt-6.5 pb-4.5">
        <h1 className="font-display text-3xl">{t('prediction.title', 'Prediction League')}</h1>
        <p className="text-textMute text-[13.5px] mt-1">{t('prediction.subtitle', 'Pick the score, climb the table, earn the trophies.')}</p>
      </div>

      <div className="max-w-[1120px] mx-auto px-4 py-6.5 pt-0">
        <div className="flex gap-1.5 flex-wrap mb-4">
          {predictionLeagues.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelectLeague?.(l.id)}
              className={`px-3.5 py-2 rounded-[9px] text-xs font-bold border ${
                l.id === activeLeagueId ? 'bg-surface2 border-diamond text-diamond' : 'border-line text-textDim'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>

        <Leaderboard rows={leaderboardRows} />

        <div className="flex gap-4 text-[11px] text-textMute mt-2.5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <TrophyIcon type="gold" /> {t('prediction.goldenTrophy', 'Golden Trophy — weekly top scorer')}
          </span>
          <span className="flex items-center gap-1.5">
            <TrophyIcon type="diamond" /> {t('prediction.diamondTrophy', 'Diamond Trophy — ≥50% exact this week')}
          </span>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-4 py-6.5">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-display text-[19px] tracking-wide">{t('prediction.predict', 'Predict')}</h2>
          <Pill status="open" label={`${t('prediction.locksIn', 'Locks in')} ${lockLabel}`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matchesToPredict.map((item) => (
            <PredictionCard
              key={item.match.id}
              match={item.match}
              mode={item.mode}
              initial={item.initial}
              initial2={item.initial2}
              enteredByAdmin={item.enteredByAdmin}
              onSave={onSavePrediction}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
