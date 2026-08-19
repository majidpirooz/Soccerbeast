/** SelectField — labeled <select>, used for competition/reason-tag/arena pickers etc. */
export default function SelectField({ label, hint, options = [], className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-[11.5px] font-bold text-textDim mb-1.5">{label}</span>}
      <select
        {...props}
        className="w-full bg-surface2 border border-line rounded-[9px] px-3 py-2.5 text-[13px] text-text
          focus:outline-none focus:border-gold transition-colors appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="block text-[10.5px] text-textMute mt-1">{hint}</span>}
    </label>
  );
}
