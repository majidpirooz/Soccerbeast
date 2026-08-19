const VARIANTS = {
  gold: 'bg-gold/15 text-gold',
  diamond: 'bg-diamond/15 text-diamond',
  win: 'bg-win/15 text-win',
  loss: 'bg-loss/15 text-loss',
  neutral: 'bg-white/10 text-textDim',
};

/** Tag — small badge, e.g. "Top Tier Only", "Scheduled", "Unmatched". */
export default function Tag({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
