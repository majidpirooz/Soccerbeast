const ICON_STYLES = {
  goal: 'bg-win',
  yellow: 'bg-[#E3B341]',
  red: 'bg-loss',
  sub: 'bg-diamond',
};

/**
 * Timeline — Match Page "Events" tab (spec §6.8). `events` items:
 * { id, minute, type, title, sub? }
 */
export default function Timeline({ events = [] }) {
  return (
    <div className="border-s-2 border-line ms-1.5 ps-5">
      {events.map((e) => (
        <div key={e.id} className="relative py-3">
          <span
            className="absolute w-2.5 h-2.5 rounded-full bg-gold border-2 border-bg"
            style={{ insetInlineStart: -27, top: 15 }}
          />
          <div className="flex items-center gap-2.5 text-[12.5px] font-bold">
            <span className="font-display text-[13px] text-gold">{e.minute}</span>
            <span className={`w-4 h-4 rounded flex-shrink-0 ${ICON_STYLES[e.type] || 'bg-textMute'}`} />
            {e.title}
          </div>
          {e.sub && <div className="text-[11.5px] text-textMute mt-0.5 ms-0.5">{e.sub}</div>}
        </div>
      ))}
    </div>
  );
}
