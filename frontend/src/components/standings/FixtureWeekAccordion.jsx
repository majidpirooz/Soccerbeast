import { useState } from 'react';
import Crest from '../ui/Crest';

/**
 * FixtureWeekAccordion — one collapsible section per Week (spec §6.5).
 * `week`: { id, label, open, fixtures: [{ id, time, home, away, score }] }
 * All closed by default except the current week, per spec — pass
 * `week.open = true` for that one week.
 */
export default function FixtureWeekAccordion({ week, onOpenMatch }) {
  const [open, setOpen] = useState(!!week.open);

  return (
    <div className="border border-line rounded-xl mb-2.5 overflow-hidden bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-extrabold"
      >
        <span>{week.label}</span>
        <span
          className={`w-[7px] h-[7px] border-r-2 border-b-2 border-textMute transition-transform ${
            open ? '-rotate-135' : 'rotate-45'
          }`}
        />
      </button>
      <div className="overflow-hidden transition-[max-height] duration-250 ease-in-out" style={{ maxHeight: open ? 1200 : 0 }}>
        <div className="px-3 pb-3 flex flex-col gap-2">
          {week.fixtures.map((f, i) => (
            <button
              key={f.id}
              onClick={() => onOpenMatch?.(f)}
              className={`flex items-center gap-2.5 py-2 px-1.5 text-[12.5px] text-start ${
                i > 0 ? 'border-t border-dashed border-lineSoft' : ''
              }`}
            >
              <span className="w-11 text-textMute font-bold text-[11px] flex-shrink-0">{f.time}</span>
              <span className="flex-1 flex items-center justify-end gap-2 font-bold">
                {f.home.name} <Crest team={f.home} size="sm" />
              </span>
              <span className="w-11 text-center font-display text-gold">{f.score}</span>
              <span className="flex-1 flex items-center gap-2 font-bold">
                <Crest team={f.away} size="sm" /> {f.away.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
