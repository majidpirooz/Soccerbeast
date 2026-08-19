import { useState } from 'react';

/**
 * Captcha — spec §6.2/§6.3/§6.4 all require a captcha on Sign In, Password
 * Recovery, and Join. This is a **visual placeholder only** — a real
 * captcha (hCaptcha, Turnstile, reCAPTCHA, etc.) needs a server-side
 * verify step and a site key, neither of which belongs in a component
 * library. Swap this out for whichever provider gets chosen, keeping the
 * same `onVerify(boolean)` contract so the three auth pages don't need to
 * change.
 */
export default function Captcha({ onVerify }) {
  const [checked, setChecked] = useState(false);

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    onVerify?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full flex items-center gap-3 border border-line rounded-[10px] px-3.5 py-3 bg-surface2"
    >
      <span
        className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
          checked ? 'bg-win border-win' : 'border-line'
        }`}
      >
        {checked && <span className="text-[#0A120E] text-xs font-black">✓</span>}
      </span>
      <span className="text-[12.5px] font-semibold text-textDim">I'm not a robot</span>
      <span className="text-[9px] text-textMute ms-auto">placeholder — wire a real provider</span>
    </button>
  );
}
