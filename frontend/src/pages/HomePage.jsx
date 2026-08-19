import Crest from '../components/ui/Crest';
import Button from '../components/ui/Button';
import Pill from '../components/ui/Pill';
import MatchCard from '../components/match/MatchCard';
import { useT } from '../context/I18nContext';

/**
 * HomePage — spec §6.2. `heroMatch` drives the top slider, `miniMatches`
 * fills the 3-up strip beneath it, `nextMatch` is the "Open for prediction"
 * feature card, `latestMatches` populate the results grid.
 *
 * `heroMatch` and `nextMatch` can both be null — a fresh deploy has zero
 * matches until an admin adds some, and GET /home returns null rather than
 * fabricating one (see that route's own doc comment). Both sections render
 * a plain empty state instead in that case, rather than crashing on
 * `heroMatch.home.name` etc.
 */
export default function HomePage({ heroMatch, miniMatches = [], nextMatch, latestMatches = [], onOpenMatch, onNavigate }) {
  const t = useT();
  return (
    <div>
      {heroMatch ? (
        <div className="relative rounded-b-[22px] overflow-hidden bg-pitch-stripes min-h-[280px] flex items-end">
          <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_80%_0%,rgba(232,184,75,0.16),transparent_65%)]" />
          <div className="relative p-4 pt-6 pb-5.5 w-full">
            {heroMatch.dateLabel && <div className="text-[11.5px] text-diamond font-bold tracking-wide mb-2.5">{heroMatch.dateLabel}</div>}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 flex flex-col items-center gap-2">
                <Crest team={heroMatch.home} size="lg" />
                <div className="text-[13px] font-bold text-center">{heroMatch.home?.name}</div>
              </div>
              <div className="font-display text-[34px] text-gold tracking-wide flex-shrink-0">
                {heroMatch.homeScore}–{heroMatch.awayScore}
              </div>
              <div className="flex-1 flex flex-col items-center gap-2">
                <Crest team={heroMatch.away} size="lg" />
                <div className="text-[13px] font-bold text-center">{heroMatch.away?.name}</div>
              </div>
            </div>
            <div className="flex gap-2.5">
              <Button onClick={() => onOpenMatch?.(heroMatch)}>{t('home.watchLive', 'Watch Live')}</Button>
              <Button variant="ghost" onClick={() => onOpenMatch?.(heroMatch)}>{t('home.matchPage', 'Match Page')}</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface border-b border-line py-10 px-4 text-center text-textMute text-[13px]">
          {t('home.noMatchesYet', "No matches yet — check back once the season's fixtures are added.")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-4 -mt-2.5 relative">
        {miniMatches.map((m) => (
          <button key={m.id} onClick={() => onOpenMatch?.(m)} className="bg-surface border border-line rounded-xl p-3 flex items-center gap-2.5 text-start">
            <Crest team={m.home} size="sm" />
            <div className="flex-1">
              <div className="text-[10.5px] text-textMute mb-1.5">{m.competition?.name}</div>
              <div className="flex justify-between items-center text-[12.5px] font-bold">
                <span>{m.home.name}</span>
                <span>{m.status === 'finished' ? `${m.homeScore}–${m.awayScore}` : m.kickoffLabel}</span>
                <span>{m.away.name}</span>
              </div>
            </div>
            <Crest team={m.away} size="sm" />
          </button>
        ))}
      </div>

      <div className="max-w-[1120px] mx-auto px-4 py-6.5">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-display text-[19px] tracking-wide">{t('home.nextMatch', 'Next Match')}</h2>
          {nextMatch && <Pill status={nextMatch.status} label={t('home.openForPrediction', 'Open for prediction')} />}
        </div>
        {nextMatch ? (
          <MatchCard match={nextMatch} showPredictBar onOpenMatch={onOpenMatch} />
        ) : (
          <p className="text-textMute text-[13px]">{t('home.noUpcomingMatch', 'No upcoming match yet.')}</p>
        )}
      </div>

      <div className="max-w-[1120px] mx-auto px-4 py-6.5">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-display text-[19px] tracking-wide">{t('home.latestMatches', 'Latest Matches')}</h2>
          <button onClick={() => onNavigate?.('live')} className="text-xs font-bold text-diamond">
            {t('common.seeAll', 'See all')} <span className="inline-block rtl:-scale-x-100">→</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {latestMatches.map((m) => (
            <MatchCard key={m.id} match={m} onOpenMatch={onOpenMatch} />
          ))}
        </div>
      </div>
    </div>
  );
}
