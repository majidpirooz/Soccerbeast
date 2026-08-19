/**
 * TrophyIcon — Golden Trophy (weekly top scorer, spec §7.3) and Diamond
 * Trophy (≥50% exact predictions in a week, spec §7.2). Distinct silhouettes
 * so the two never get confused at a glance: hexagon-shield for Gold,
 * rhombus for Diamond.
 */
export default function TrophyIcon({ type = 'gold', size = 16, className = '' }) {
  const style = { width: size, height: size };
  if (type === 'diamond') {
    return <div className="clip-trophy-diamond bg-diamond flex-shrink-0" style={style} title="Diamond Trophy" />;
  }
  return <div className="clip-trophy-gold bg-gold flex-shrink-0" style={style} title="Golden Trophy" />;
}
