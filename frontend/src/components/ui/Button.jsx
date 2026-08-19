const VARIANTS = {
  gold: 'bg-gradient-to-br from-gold to-[#C99A34] text-[#1B1206] font-extrabold',
  ghost: 'border border-line text-textDim hover:text-text hover:border-textMute',
};

export default function Button({ variant = 'gold', className = '', children, ...props }) {
  return (
    <button
      className={`px-4 py-2.5 rounded-[9px] text-[13px] font-bold transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
