import SectionCard from '../ui/SectionCard';
import Button from '../ui/Button';
import { useT } from '../../context/I18nContext';

/**
 * PreviousLeaguesList — spec §6.11 regular-user bullet 7 / §7.6. Archived
 * leaderboards for any PredictionLeague the user was part of that has
 * since finished. Archive naming is `{League Name} {Season}` per spec
 * (e.g. "Masters League 2026-2027"), already baked into `label` here.
 */
export default function PreviousLeaguesList({ leagues = [], onView }) {
  const t = useT();
  return (
    <SectionCard title={t('profile.previousLeagues', 'Previous Leagues')} description={t('profile.previousLeaguesDescription', 'Archived leaderboards from leagues that have since finished.')}>
      {leagues.length === 0 && <p className="text-[12.5px] text-textMute">{t('profile.noArchivedLeagues', 'No archived leagues yet.')}</p>}
      <div className="flex flex-col gap-2">
        {leagues.map((l) => (
          <div key={l.id} className="flex items-center justify-between border-t border-dashed border-lineSoft first:border-0 py-2.5">
            <span className="font-bold text-[13px]">{l.label}</span>
            <Button variant="ghost" onClick={() => onView?.(l)}>
              {t('profile.viewLeaderboard', 'View Leaderboard')}
            </Button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
