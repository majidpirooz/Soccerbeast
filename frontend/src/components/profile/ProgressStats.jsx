import SectionCard from '../ui/SectionCard';
import { useT } from '../../context/I18nContext';

/**
 * ProgressStats — spec §6.11 regular-user bullet 2: weekly points, overall
 * points, exact-prediction history (which match, which week, how many).
 * `history` items: { id, week, match, exactCount }.
 */
export default function ProgressStats({ weeklyPoints, overallPoints, history = [] }) {
  const t = useT();
  return (
    <SectionCard title={t('profile.progress', 'Progress')}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatBlock label={t('profile.thisWeek', 'This Week')} value={weeklyPoints} />
        <StatBlock label={t('profile.overall', 'Overall')} value={overallPoints} />
      </div>

      <h4 className="text-[11px] uppercase tracking-wide text-textMute mb-2">{t('profile.exactHistory', 'Exact Prediction History')}</h4>
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {history.map((h) => (
          <div key={h.id} className="flex items-center gap-2.5 text-[12.5px] border-t border-dashed border-lineSoft first:border-0 py-2">
            <span className="text-textMute w-16 flex-shrink-0">{h.week}</span>
            <span className="flex-1 font-semibold">{h.match}</span>
            <span className="font-display text-gold text-sm">{h.exactCount} {t('prediction.exact', 'exact')}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="bg-surface2 border border-line rounded-xl px-4 py-3.5 text-center">
      <div className="font-display text-2xl text-gold">{value}</div>
      <div className="text-[10.5px] text-textMute uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
