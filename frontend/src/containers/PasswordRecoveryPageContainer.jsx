import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PasswordRecoveryPage from '../pages/PasswordRecoveryPage';

export default function PasswordRecoveryPageContainer({ onGoToSignIn }) {
  const { recoverPassword } = useAuth();
  const [result, setResult] = useState(null);

  return (
    <PasswordRecoveryPage
      result={result}
      onGoToSignIn={() => {
        setResult(null);
        onGoToSignIn?.();
      }}
      onRecover={async (username) => {
        try {
          const { result } = await recoverPassword(username);
          setResult(result);
        } catch (err) {
          setResult('invalid-username');
        }
      }}
    />
  );
}
