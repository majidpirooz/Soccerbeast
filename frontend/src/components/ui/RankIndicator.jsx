/**
 * RankIndicator — used on the Leagues/Standings table and the Prediction
 * leaderboard (spec §6.5 / §6.9). Deliberately drawn as a bare shape with
 * no enclosing circle: green up-triangle, red down-triangle, grey dot for
 * unchanged. `change` is one of 'up' | 'down' | 'same'.
 */
export default function RankIndicator({ change, className = '' }) {
  return (
    <div className={`w-6 h-6 flex items-center justify-center flex-shrink-0 ${className}`}>
      {change === 'up' && (
        <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-win" />
      )}
      {change === 'down' && (
        <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[7px] border-l-transparent border-r-transparent border-t-loss" />
      )}
      {change === 'same' && <div className="w-1.5 h-1.5 rounded-full bg-textMute" />}
    </div>
  );
}
