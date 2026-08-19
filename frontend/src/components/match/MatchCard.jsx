import Crest from '../ui/Crest';
import Pill from '../ui/Pill';
import PredictBar from './PredictBar';
import EventsPanel from './EventsPanel';

/**
 * MatchCard — spec §6.10. Renders the 10 Match Card fields; interaction
 * rules from the spec are wired as separate callbacks so this component
 * stays router-agnostic:
 *  - onOpenMatch(match)  → clicking anywhere on the card except team/league
 *  - onOpenTeam(team)    → clicking a team name or crest
 *  - onOpenLeague(match) → clicking the league name
 *
 * `showEvents` toggles the expandable event feed (used on the Live page,
 * not needed on compact Home-page cards).
 * `highlighted` = true when this match is also in one of the signed-in
 * user's prediction leagues (spec §6.7).
 *
 * RTL note: the away side's `flex-row-reverse` is intentional and is safe
 * under `dir="rtl"` — flex-row-reverse is itself direction-aware, so it
 * keeps producing "crest at the outer edge, name toward center" on
 * whichever physical side the away team ends up on. Don't replace it with
 * a fixed `flex-row`; that would only look right in one direction.
 */
export default function MatchCard({
  match,
  showEvents = false,
  showPredictBar = false,
  highlighted = false,
  onOpenMatch,
  onOpenTeam,
  onOpenLeague,
}) {
  const { home, away, homeScore, awayScore, status, minute, competition, events } = match;

  const scoreLabel =
    status === 'finished' || status === 'live'
      ? `${homeScore ?? 0}–${awayScore ?? 0}`
      : match.kickoffLabel || 'VS';

  const stop = (fn, arg) => (e) => {
    e.stopPropagation();
    fn?.(arg);
  };

  return (
    <div
      onClick={() => onOpenMatch?.(match)}
      className={`bg-surface border rounded-card p-3.5 cursor-pointer transition-colors hover:border-textMute
        ${highlighted ? 'border-gold ring-2 ring-gold/10' : 'border-line'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={stop(onOpenLeague, match)}
          className="flex items-center gap-1.5 text-[11.5px] font-bold text-textDim"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          {competition?.name}
          {competition?.round ? ` · ${competition.round}` : ''}
        </button>
        <Pill status={status} label={status === 'live' ? minute : undefined} />
      </div>

      <div className="flex items-center gap-2.5">
        <button onClick={stop(onOpenTeam, home)} className="flex-1 flex items-center gap-2.5 text-start">
          <Crest team={home} size="md" />
          <span className="text-[13.5px] font-bold">{home?.name}</span>
        </button>

        <div className="text-center min-w-[64px]">
          <div className="font-display text-[22px] tracking-wide">{scoreLabel}</div>
          {status !== 'finished' && status !== 'live' && (
            <div className="text-[11px] text-textMute font-bold">{match.kickoffLabel}</div>
          )}
        </div>

        <button onClick={stop(onOpenTeam, away)} className="flex-1 flex items-center gap-2.5 flex-row-reverse text-end">
          <Crest team={away} size="md" />
          <span className="text-[13.5px] font-bold">{away?.name}</span>
        </button>
      </div>

      {showPredictBar && match.predictionSplit && (
        <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-lineSoft">
          <span className="text-[11px] text-textMute flex-shrink-0">Predictions</span>
          <PredictBar split={match.predictionSplit} className="flex-1" />
        </div>
      )}

      {showEvents && <EventsPanel events={events || []} />}
    </div>
  );
}
