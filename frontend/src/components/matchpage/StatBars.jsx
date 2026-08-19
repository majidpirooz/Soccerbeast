/**
 * StatBars — Match Page "Stats" tab (spec §6.8). `stats` items:
 * { label, home, away, unit? } — unit defaults to plain number.
 */
export default function StatBars({ stats = [] }) {
  return (
    <div>
      {stats.map((s) => {
        const total = s.home + s.away || 1;
        const homePct = (s.home / total) * 100;
        const awayPct = (s.away / total) * 100;
        return (
          <div key={s.label} className="mb-4">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-gold">{s.home}{s.unit || ''}</span>
              <span className="text-diamond">{s.away}{s.unit || ''}</span>
            </div>
            <div className="flex h-2 rounded overflow-hidden bg-line">
              <div className="bg-gold h-full" style={{ width: `${homePct}%` }} />
              <div className="bg-diamond h-full" style={{ width: `${awayPct}%` }} />
            </div>
            <div className="text-center text-[10.5px] text-textMute mt-1.5 uppercase tracking-wide">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}
