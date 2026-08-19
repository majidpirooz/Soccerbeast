import Crest from '../ui/Crest';
import { useT } from '../../context/I18nContext';

/**
 * MatchHeader — top section of the dedicated Match Page (spec §6.8):
 * team names + crests, result, venue, status/referee meta row.
 */
export default function MatchHeader({ match }) {
  const t = useT();
  const { home, away, homeScore, awayScore, competition, venue, referee, status } = match;

  return (
    <div className="bg-pitch-stripes-alt rounded-b-[20px] px-4 pt-8 pb-6">
      <div className="text-[12px] text-textMute mb-1">
        {competition?.name}
        {competition?.round ? ` · ${competition.round}` : ''}
      </div>
      <div className="flex items-center gap-3.5 mt-4">
        <div className="flex-1 flex flex-col items-center gap-2.5">
          <Crest team={home} size="lg" />
          <div className="font-display text-base text-center tracking-wide">{home?.name}</div>
        </div>
        <div className="font-display text-[44px] tracking-wide flex-shrink-0">
          {homeScore ?? '–'}–{awayScore ?? '–'}
        </div>
        <div className="flex-1 flex flex-col items-center gap-2.5">
          <Crest team={away} size="lg" />
          <div className="font-display text-base text-center tracking-wide">{away?.name}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3.5 justify-center mt-4.5 text-[11.5px] text-textDim">
        {venue && <MetaItem>{venue}</MetaItem>}
        {status && <MetaItem>{status === 'finished' ? t('match.fullTime', 'Full Time') : status}</MetaItem>}
        {referee && <MetaItem>Ref: {referee}</MetaItem>}
      </div>
    </div>
  );
}

function MetaItem({ children }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-gold rounded-sm" />
      {children}
    </span>
  );
}
