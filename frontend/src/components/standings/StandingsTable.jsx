import Crest from '../ui/Crest';
import RankIndicator from '../ui/RankIndicator';
import FormDots from '../ui/FormDots';
import { useT } from '../../context/I18nContext';

/**
 * StandingsTable — spec §6.5. One row per team. `rows` items:
 * { rank, change: 'up'|'down'|'same', team, p, w, d, l, gf, ga, pts, form: ['w','d','l',...] }
 *
 * GF and GA are intentionally separate columns (not merged), per spec.
 * `onOpenTeam` fires when a team name/crest is clicked.
 *
 * P/W/D/L/GF/GA/GD/Pts are left as Latin abbreviations even in Persian —
 * that matches common practice in Persian-language football coverage
 * (compact standard abbreviations rather than translated single letters,
 * which read poorly). Only the two full-word headers (Club, Previous
 * Matches) are translated.
 */
export default function StandingsTable({ rows = [], onOpenTeam, highlightTeamId }) {
  const t = useT();
  return (
    <div className="overflow-x-auto border border-line rounded-card bg-surface">
      <table className="w-full border-collapse min-w-[640px] text-[12.5px]">
        <thead>
          <tr>
            <th className="text-start ps-4 py-3 text-[10px] uppercase tracking-wide text-textMute font-normal border-b border-line">
              {t('leagues.club', 'Club')}
            </th>
            {['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map((h) => (
              <th key={h} className="text-center py-3 text-[10px] uppercase tracking-wide text-textMute font-normal border-b border-line">
                {h}
              </th>
            ))}
            <th className="text-center py-3 text-[10px] uppercase tracking-wide text-textMute font-normal border-b border-line">
              {t('leagues.previousMatches', 'Previous Matches')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const gd = row.gf - row.ga;
            const isHighlighted = row.team.id === highlightTeamId;
            return (
              <tr key={row.team.id} className={isHighlighted ? 'bg-gold/[0.04]' : ''}>
                <td className="text-start ps-4 py-2.5 border-b border-lineSoft last:border-0">
                  <div className="flex items-center gap-2.5 font-bold text-[13px]">
                    <RankIndicator change={row.change} />
                    <button onClick={() => onOpenTeam?.(row.team)} className="flex items-center gap-2.5">
                      <Crest team={row.team} size="sm" />
                      {row.team.name}
                    </button>
                  </div>
                </td>
                <td className="text-center py-2.5 border-b border-lineSoft">{row.p}</td>
                <td className="text-center py-2.5 border-b border-lineSoft">{row.w}</td>
                <td className="text-center py-2.5 border-b border-lineSoft">{row.d}</td>
                <td className="text-center py-2.5 border-b border-lineSoft">{row.l}</td>
                <td className="text-center py-2.5 border-b border-lineSoft">{row.gf}</td>
                <td className="text-center py-2.5 border-b border-lineSoft">{row.ga}</td>
                <td className="text-center py-2.5 border-b border-lineSoft">{gd > 0 ? `+${gd}` : gd}</td>
                <td className="text-center py-2.5 border-b border-lineSoft font-display text-gold text-sm">{row.pts}</td>
                <td className="text-center py-2.5 border-b border-lineSoft">
                  <FormDots results={row.form} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
