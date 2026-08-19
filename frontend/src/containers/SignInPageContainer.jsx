import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SignInPage from '../pages/SignInPage';

export default function SignInPageContainer({ onSignedIn, onGoToRecovery, onGoToJoin }) {
  const { signIn } = useAuth();
  const [error, setError] = useState(null);

  return (
    <SignInPage
      error={error}
      onGoToRecovery={onGoToRecovery}
      onGoToJoin={onGoToJoin}
      onSignIn={async (credentials) => {
        setError(null);
        try {
          await signIn(credentials);
          onSignedIn?.();
        } catch (err) {
          setError(err.message || 'Sign in failed.');
        }
      }}
    />
  );
}
