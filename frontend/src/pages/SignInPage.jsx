import { useState } from 'react';
import AuthShell from '../components/layout/AuthShell';
import TextField from '../components/ui/TextField';
import Captcha from '../components/ui/Captcha';
import Button from '../components/ui/Button';
import { useT } from '../context/I18nContext';

/** SignInPage — spec §6.2: username, password, Sign In, "forgot my password" link, captcha. */
export default function SignInPage({ onSignIn, onGoToRecovery, onGoToJoin, error }) {
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);

  const canSubmit = username && password && captchaOk;

  return (
    <AuthShell
      title={t('auth.signInTitle', 'Sign In')}
      footer={
        <>
          {t('auth.newHere', 'New here?')}{' '}
          <button onClick={onGoToJoin} className="font-bold text-diamond">
            {t('auth.joinTitle', 'Join Soccer Beast')}
          </button>
        </>
      }
    >
      {error && <p className="text-[12px] text-loss text-center">{error}</p>}

      <TextField label={t('auth.username', 'Username')} value={username} onChange={(e) => setUsername(e.target.value)} required />
      <TextField
        label={t('auth.password', 'Password')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Captcha onVerify={setCaptchaOk} />

      <Button
        disabled={!canSubmit}
        className="disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => onSignIn?.({ username, password })}
      >
        {t('auth.signInTitle', 'Sign In')}
      </Button>

      <button onClick={onGoToRecovery} className="text-[12px] font-semibold text-textDim self-center">
        {t('auth.forgotPassword', 'Forgot my password')}
      </button>
    </AuthShell>
  );
}
