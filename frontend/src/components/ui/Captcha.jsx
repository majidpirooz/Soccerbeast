import { useState } from 'react';

/**
 * Captcha — spec §6.2/§6.3/§6.4 all require a captcha on Sign In, Password
 * Recovery, and Join. This is a manual confirmation checkbox, not a real
 * bot-blocking captcha — a genuine one (hCaptcha, Cloudflare Turnstile,
 * reCAPTCHA) needs a server-side verify step and a provider site key,
 * which is a deliberate choice to make when actually wiring one in, not
 * something to fake here. The checkbox itself is fully functional (click
 * toggles `onVerify(boolean)`, which every auth page uses to gate its
 * submit button) — what was previously wrong was showing the internal
 * "wire a real provider" dev note directly to end users, making it look
 * broken. That's removed; swap this component out for a real provider's
 * widget later, keeping the same `onVerify(boolean)` contract so none of
 * the three auth pages need to change.
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
      className="w-full flex items-center gap-3 border border-line rounded-[10px] px-3.5 py-3 bg-surface2 hover:border-textMute transition-colors"
    >
      <span
        className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
          checked ? 'bg-win border-win' : 'border-line'
        }`}
      >
        {checked && <span className="text-[#0A120E] text-xs font-black">✓</span>}
      </span>
      <span className="text-[12.5px] font-semibold text-textDim">I'm not a robot</span>
    </button>
  );
}
