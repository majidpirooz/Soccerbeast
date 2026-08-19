import { useState } from 'react';
import { useT } from '../../context/I18nContext';

const ICON_STYLES = {
  goal: 'bg-win',
  own_goal: 'bg-win',
  penalty_goal: 'bg-win',
  yellow_card: 'bg-[#E3B341]',
  red_card: 'bg-loss',
  substitution: 'bg-diamond',
};

/**
 * EventsPanel — closed-by-default expandable event feed on a live match
 * card (spec §6.7). `events` items: { id, minute, type, text }.
 *
 * Note on second yellows (spec §2.3): the data source never emits a
 * distinct "second yellow" event type. If you need to show a combined
 * yellow+red icon, detect it by grouping `yellow_card` events per
 * (match_id, player_name) upstream of this component — this component
 * just renders whatever `type` it's given.
 */
export default function EventsPanel({ events = [] }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-textDim pt-2.5 select-none"
      >
        <span>{t('live.matchEvents', 'Match Events')}</span>
        <span
          className={`w-[7px] h-[7px] border-r-2 border-b-2 border-current transition-transform ${
            open ? '-rotate-135' : 'rotate-45'
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-250 ease-in-out"
        style={{ maxHeight: open ? 400 : 0 }}
      >
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-2.5 py-2 text-[12.5px] border-t border-dashed border-lineSoft">
            <span className="font-display text-xs text-gold w-8 flex-shrink-0">{e.minute}</span>
            <span className={`w-4 h-4 rounded flex-shrink-0 ${ICON_STYLES[e.type] || 'bg-textMute'}`} />
            <span>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
