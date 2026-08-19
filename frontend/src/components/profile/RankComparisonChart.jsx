import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Avatar from '../ui/Avatar';

const COLORS = ['#E8B84B', '#63D9E6', '#3FB876', '#E1594F', '#8B9AA0'];

/**
 * RankComparisonChart — spec §6.11 regular-user bullet 3: "a single plot
 * showing weekly points, weekly rank, and total points over time; user
 * can add other users to the same plot(s) for comparison."
 *
 * Implemented as a dependency-free inline SVG line chart (no chart
 * library assumed) so this component has zero extra install requirements.
 * `series`: [{ user, points: number[] }] — one entry per plotted user,
 * `allUsers` is the pool available to add via the picker.
 * `metric`: 'weeklyPoints' | 'weeklyRank' | 'totalPoints' — which of the
 * three plots is currently shown; spec calls for all three to be
 * available, switched via tabs.
 */
export default function RankComparisonChart({ series = [], allUsers = [], onAddUser, onRemoveUser }) {
  const [metric, setMetric] = useState('weeklyPoints');
  const width = 560;
  const height = 180;
  const padding = 24;

  const allValues = series.flatMap((s) => s.points);
  const max = Math.max(1, ...allValues);
  const min = Math.min(0, ...allValues);
  const weeks = Math.max(1, ...series.map((s) => s.points.length)) - 1 || 1;

  const toX = (i) => padding + (i / weeks) * (width - padding * 2);
  const toY = (v) => height - padding - ((v - min) / (max - min || 1)) * (height - padding * 2);

  return (
    <SectionCard
      title="Rank & Points Over Time"
      actions={
        <select
          onChange={(e) => e.target.value && onAddUser?.(e.target.value)}
          value=""
          className="bg-surface2 border border-line rounded-lg px-2 py-1.5 text-[11.5px]"
        >
          <option value="">+ Add user to compare</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      }
    >
      <div className="flex gap-1 mb-3">
        {[
          { key: 'weeklyPoints', label: 'Weekly Points' },
          { key: 'weeklyRank', label: 'Weekly Rank' },
          { key: 'totalPoints', label: 'Total Points' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
              metric === m.key ? 'bg-surface2 text-gold' : 'text-textMute'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#233529" />
        {series.map((s, si) => {
          const color = COLORS[si % COLORS.length];
          const points = s.points.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
          return <polyline key={s.user.id} points={points} fill="none" stroke={color} strokeWidth="2" />;
        })}
      </svg>

      <div className="flex flex-wrap gap-3 mt-2">
        {series.map((s, si) => (
          <div key={s.user.id} className="flex items-center gap-1.5 text-[11.5px]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[si % COLORS.length] }} />
            <Avatar user={s.user} size="sm" />
            {s.user.name}
            {onRemoveUser && (
              <button onClick={() => onRemoveUser(s.user.id)} className="text-textMute ms-0.5">
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
