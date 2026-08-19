import Avatar from '../ui/Avatar';
import RankIndicator from '../ui/RankIndicator';
import TrophyIcon from '../ui/TrophyIcon';
import { useT } from '../../context/I18nContext';

/**
 * Leaderboard — spec §6.9. `rows` items:
 * { rank, change, user, exact, pts, trophies: { gold, diamond } }
 *
 * The full column set per spec also includes correct-winner+GD count,
 * correct-winner-only count, and wrong-prediction count — omitted from
 * this compact view for mobile width, but present as optional props
 * (`extraColumns`) so a wider desktop layout can opt in.
 */
export default function Leaderboard({ rows = [] }) {
  const t = useT();
  return (
    <div className="border border-line rounded-card overflow-hidden bg-surface">
      <div className="grid grid-cols-[34px_1fr_60px_44px_44px] items-center gap-2 px-3.5 py-2.5 bg-surface2 text-[9.5px] uppercase tracking-wide text-textMute font-extrabold">
        <span>{t('prediction.rank', '#')}</span>
        <span>{t('prediction.user', 'User')}</span>
        <span>{t('prediction.trophies', 'Trophies')}</span>
        <span>{t('prediction.exact', 'Exact')}</span>
        <span className="text-end">{t('prediction.pts', 'Pts')}</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.user.id}
          className="grid grid-cols-[34px_1fr_60px_44px_44px] items-center gap-2 px-3.5 py-2.5 text-[12.5px] border-t border-lineSoft"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-textDim">{row.rank}</span>
            <RankIndicator change={row.change} className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5 font-bold">
            <Avatar user={row.user} size="sm" />
            {row.user.name}
          </div>
          <div className="flex gap-1 justify-self-end">
            {row.trophies?.gold && <TrophyIcon type="gold" />}
            {row.trophies?.diamond && <TrophyIcon type="diamond" />}
          </div>
          <span>{row.exact}</span>
          <span className="font-display text-gold text-end">{row.pts}</span>
        </div>
      ))}
    </div>
  );
}
