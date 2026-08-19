const SIZES = {
  sm: 'w-[26px] h-[26px] text-[10px]',
  md: 'w-[38px] h-[38px] text-sm',
  lg: 'w-[58px] h-[58px] text-xl',
};

/**
 * Crest — team badge. Falls back to a lettered circle when no crest image
 * is set on the Team entity yet (common for manually-added cup/knockout teams
 * before an admin uploads a crest — see spec §2.4).
 */
export default function Crest({ team, size = 'md', className = '' }) {
  const sizeCls = SIZES[size] || SIZES.md;
  if (team?.crest) {
    return (
      <img
        src={team.crest}
        alt={team.name}
        className={`${sizeCls} rounded-full object-cover border border-line flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      className={`${sizeCls} rounded-full bg-surface2 border border-line flex items-center justify-center
        font-display text-textDim flex-shrink-0 ${className}`}
    >
      {team?.short || '?'}
    </div>
  );
}
