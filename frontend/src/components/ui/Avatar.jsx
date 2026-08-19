const SIZES = {
  sm: 'w-[26px] h-[26px] text-[10px]',
  md: 'w-8 h-8 text-xs',
};

export default function Avatar({ user, size = 'md', className = '' }) {
  const sizeCls = SIZES[size] || SIZES.md;
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`${sizeCls} rounded-full object-cover border border-line flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      className={`${sizeCls} rounded-full bg-surface2 border border-line flex items-center justify-center
        font-extrabold text-gold flex-shrink-0 ${className}`}
    >
      {user?.initials || '?'}
    </div>
  );
}
