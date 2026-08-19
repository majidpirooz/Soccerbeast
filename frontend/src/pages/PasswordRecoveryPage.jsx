import { useState } from 'react';
import AuthShell from '../components/layout/AuthShell';
import TextField from '../components/ui/TextField';
import Captcha from '../components/ui/Captcha';
import Button from '../components/ui/Button';
import { useT } from '../context/I18nContext';

/**
 * PasswordRecoveryPage — spec §6.3. There is deliberately no "email a
 * reset link" flow: on a valid username, a strong password is generated
 * and sent to **Admin**, who manually relays it to the user (small-scale,
 * friend-group-app design choice per the spec). `onRecover` should
 * resolve to either 'sent' or 'invalid-username'; this component just
 * renders whichever `result` it's given.
 */
export default function PasswordRecoveryPage({ onRecover, onGoToSignIn, result }) {
  const t = useT();
  const [username, setUsername] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);

  return (
    <AuthShell
      title={t('auth.recoveryTitle', 'Password Recovery')}
      subtitle={t('auth.recoverySubtitle', "A new password will be generated and sent to the site administrator, who'll relay it to you.")}
      footer={
        <button onClick={onGoToSignIn} className="font-bold text-diamond">
          {t('auth.backToSignIn', 'Back to Sign In')}
        </button>
      }
    >
      {result === 'sent' && (
        <p className="text-[12px] text-win text-center bg-win/10 border border-win/30 rounded-lg py-2 px-3">
          {t('auth.recoverySent', 'Request sent — the admin will be in touch with your new password shortly.')}
        </p>
      )}
      {result === 'invalid-username' && (
        <p className="text-[12px] text-loss text-center bg-loss/10 border border-loss/30 rounded-lg py-2 px-3">
          {t('auth.recoveryInvalidUsername', "We couldn't find an account with that username.")}
        </p>
      )}

      <TextField label={t('auth.username', 'Username')} value={username} onChange={(e) => setUsername(e.target.value)} required />
      <Captcha onVerify={setCaptchaOk} />

      <Button
        disabled={!username || !captchaOk}
        className="disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => onRecover?.(username)}
      >
        {t('auth.recoverButton', 'Recover My Password')}
      </Button>
    </AuthShell>
  );
}
