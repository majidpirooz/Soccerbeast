/**
 * TextField — labeled input, used across every admin form (arena name,
 * kickoff time, polling interval, etc.) and the account-settings form.
 */
export default function TextField({ label, hint, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-[11.5px] font-bold text-textDim mb-1.5">{label}</span>}
      <input
        {...props}
        className="w-full bg-surface2 border border-line rounded-[9px] px-3 py-2.5 text-[13px] text-text
          placeholder:text-textMute focus:outline-none focus:border-gold transition-colors"
      />
      {hint && <span className="block text-[10.5px] text-textMute mt-1">{hint}</span>}
    </label>
  );
}
