import { useState } from 'react';
import AuthShell from '../components/layout/AuthShell';
import TextField from '../components/ui/TextField';
import Captcha from '../components/ui/Captcha';
import Button from '../components/ui/Button';
import { useT } from '../context/I18nContext';

/**
 * JoinPage — spec §6.4. Only Username + Password are required; Invitation
 * Code, Telegram ID, and Email are all optional. What happens on success
 * is spec'd in detail but happens server-side, not in this component:
 *  - no code supplied  → auto-added to Main League
 *  - code supplied     → joins that league, offered the option to *also*
 *                        stay in Main League (that follow-up choice is
 *                        `onSubmit`'s caller's responsibility, likely a
 *                        confirmation step after this form submits)
 * This component just collects the fields and hands them off.
 */
export default function JoinPage({ onJoin, onGoToSignIn, error }) {
  const t = useT();
  const [form, setForm] = useState({ username: '', password: '', invitationCode: '', telegramId: '', email: '' });
  const [captchaOk, setCaptchaOk] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const canSubmit = form.username && form.password && captchaOk;

  return (
    <AuthShell
      title={t('auth.joinTitle', 'Join Soccer Beast')}
      footer={
        <>
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
          <button onClick={onGoToSignIn} className="font-bold text-diamond">
            {t('auth.signInTitle', 'Sign In')}
          </button>
        </>
      }
    >
      {error && <p className="text-[12px] text-loss text-center">{error}</p>}

      <TextField label={t('auth.username', 'Username')} value={form.username} onChange={(e) => set({ username: e.target.value })} required />
      <TextField
        label={t('auth.password', 'Password')}
        type="password"
        value={form.password}
        onChange={(e) => set({ password: e.target.value })}
        required
      />
      <TextField
        label={t('auth.invitationCode', 'Invitation Code')}
        hint={t('auth.invitationCodeHint', 'Optional — joins that league instead of Main League.')}
        value={form.invitationCode}
        onChange={(e) => set({ invitationCode: e.target.value })}
      />
      <TextField label={t('auth.telegramId', 'Telegram ID')} hint={t('auth.optional', 'Optional.')} value={form.telegramId} onChange={(e) => set({ telegramId: e.target.value })} />
      <TextField label={t('auth.email', 'Email')} hint={t('auth.optional', 'Optional.')} value={form.email} onChange={(e) => set({ email: e.target.value })} />

      <Captcha onVerify={setCaptchaOk} />

      <Button
        disabled={!canSubmit}
        className="disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => onJoin?.(form)}
      >
        {t('nav.join', 'Join')}
      </Button>
    </AuthShell>
  );
}
