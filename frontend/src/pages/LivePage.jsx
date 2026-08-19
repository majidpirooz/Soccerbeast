import { useState } from 'react';
import MatchCard from '../components/match/MatchCard';
import { useT } from '../context/I18nContext';

/**
 * LivePage — spec §6.7. `days`: [{ id, label, sublabel }], `leagueGroups`:
 * [{ id, name, matches: Match[] }]. `lastUpdate` is a display string;
 * `liveScoresEnabled` + `onToggleLiveScores` wire the auto-refresh switch.
 */
export default function LivePage({
  days = [],
  activeDayId,
  onSelectDay,
  leagueGroups = [],
  lastUpdate,
  liveScoresEnabled = true,
  onToggleLiveScores,
  onOpenMatch,
  highlightedMatchIds = [],
}) {
  const t = useT();
  return (
    <div className="max-w-[1120px] mx-auto px-4">
      <div className="pt-6.5 pb-4.5">
        <h1 className="font-display text-3xl">{t('live.title', 'Live Scores')}</h1>
        <p className="text-textMute text-[13.5px] mt-1">{t('live.subtitle', 'Every match, every league — updated automatically.')}</p>
      </div>

      <div className="flex items-center justify-between bg-surface border border-line rounded-xl px-3.5 py-2.5 mb-4.5 flex-wrap gap-2.5">
        <span className="text-[11.5px] text-textMute">
          {t('live.lastUpdate', 'Last update')}: <b className="text-text">{lastUpdate}</b>
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs font-bold text-textDim">{t('live.liveScoresToggle', 'Live Scores')}</span>
          <Switch checked={liveScoresEnabled} onChange={onToggleLiveScores} />
        </label>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
        {days.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelectDay?.(d.id)}
            className={`flex-shrink-0 px-3.5 py-2.5 rounded-[10px] border text-[12.5px] font-bold ${
              d.id === activeDayId
                ? 'bg-gradient-to-br from-gold to-[#C99A34] text-[#1B1206] border-transparent'
                : 'bg-surface border-line text-textDim'
            }`}
          >
            {d.label}
            <span className={`block text-[10px] font-semibold ${d.id === activeDayId ? 'text-[#3c2c05]' : 'text-textMute'}`}>{d.sublabel}</span>
          </button>
        ))}
      </div>

      {leagueGroups.map((g) => (
        <div key={g.id} className="mb-5.5">
          <h3 className="flex items-center gap-2 text-[13.5px] font-extrabold text-textDim mb-2.5 ps-0.5">
            <span className="w-1.5 h-1.5 bg-gold rounded-full" />
            {g.name}
          </h3>
          <div className="flex flex-col gap-2">
            {g.matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                showEvents
                onOpenMatch={onOpenMatch}
                highlighted={highlightedMatchIds.includes(m.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={`w-[38px] h-[22px] rounded-full relative flex-shrink-0 transition-colors ${checked ? 'bg-win/35' : 'bg-line'}`}
    >
      <span
        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-transform ${
          checked ? 'translate-x-4 rtl:-translate-x-4 bg-win' : 'bg-textDim'
        }`}
        style={{ insetInlineStart: 2 }}
      />
    </button>
  );
}
