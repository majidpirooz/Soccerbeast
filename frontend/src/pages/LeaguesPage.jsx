import StandingsTable from '../components/standings/StandingsTable';
import FixtureWeekAccordion from '../components/standings/FixtureWeekAccordion';
import { useT } from '../context/I18nContext';

/**
 * LeaguesPage — spec §6.5. `seasons`: [{ id, label }], `weeks`: fixture
 * weeks for the FixtureWeekAccordion list.
 */
export default function LeaguesPage({
  competitionName,
  seasons = [],
  activeSeasonId,
  onSelectSeason,
  onOpenLeagueSelect,
  standingsRows = [],
  weeks = [],
  onOpenTeam,
  onOpenMatch,
}) {
  const t = useT();
  return (
    <div>
      <div className="bg-pitch-stripes-alt rounded-b-[20px] pt-8.5 pb-5.5">
        <div className="max-w-[1120px] mx-auto px-4">
          <div className="text-xs text-textMute mb-2">
            {t('nav.home', 'Home')} / <b className="text-textDim">{t('nav.leagues', 'Leagues')}</b>
          </div>
          <h1 className="font-display text-[28px]">{t('leagues.title', 'Standings')}</h1>
          <div className="flex gap-2.5 flex-wrap mt-3.5">
            <button onClick={onOpenLeagueSelect} className="bg-surface border border-line rounded-[10px] px-3 py-2.5 text-[12.5px] font-bold flex items-center gap-2">
              {competitionName} <Chevron />
            </button>
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSeason?.(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold border ${
                  s.id === activeSeasonId ? 'text-gold border-goldDim bg-gold/[0.08]' : 'text-textMute border-line'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-4 py-6.5">
        <StandingsTable rows={standingsRows} onOpenTeam={onOpenTeam} />
      </div>

      <div className="max-w-[1120px] mx-auto px-4 py-6.5">
        <div className="mb-3.5">
          <h2 className="font-display text-[19px] tracking-wide">{t('leagues.fixtures', 'Fixtures')}</h2>
        </div>
        {weeks.map((w) => (
          <FixtureWeekAccordion key={w.id} week={w} onOpenMatch={onOpenMatch} />
        ))}
      </div>
    </div>
  );
}

function Chevron() {
  return <span className="w-1.5 h-1.5 border-r-2 border-b-2 border-textMute rotate-45" />;
}
