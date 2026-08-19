/** Toggle — generic on/off switch used throughout the admin panel (schedules, feature flags, enable/disable). */
export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`flex items-center gap-2.5 ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
      {label && <span className="text-[12.5px] font-bold text-textDim">{label}</span>}
      <button
        type="button"
        onClick={() => onChange?.(!checked)}
        className={`w-[38px] h-[22px] rounded-full relative flex-shrink-0 transition-colors ${checked ? 'bg-win/35' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-transform ${
            checked ? 'translate-x-4 rtl:-translate-x-4 bg-win' : 'bg-textDim'
          }`}
          style={{ insetInlineStart: 2 }}
        />
      </button>
    </label>
  );
}
