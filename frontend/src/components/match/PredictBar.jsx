/**
 * PredictBar — the prediction-statistics field from spec §6.10 item 10:
 * "% predicted home win / away win / draw". `split` = { home, draw, away }
 * as integer percentages (should sum to ~100, not enforced here).
 */
export default function PredictBar({ split, className = '' }) {
  if (!split) return null;
  return (
    <div className={className}>
      <div className="flex h-1.5 rounded overflow-hidden bg-line">
        <span className="h-full bg-gold" style={{ width: `${split.home}%` }} />
        <span className="h-full bg-draw" style={{ width: `${split.draw}%` }} />
        <span className="h-full bg-diamond" style={{ width: `${split.away}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-textMute mt-1">
        <span>Home {split.home}%</span>
        <span>Draw {split.draw}%</span>
        <span>Away {split.away}%</span>
      </div>
    </div>
  );
}
