import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import JoinPage from '../pages/JoinPage';

/**
 * JoinPageContainer — `onJoined(joinedLeague)` lets the parent decide what
 * to show next: `joinedLeague` present → the "stay in Main League too?"
 * prompt (spec §6.4); absent → straight to Home (no-code join auto-adds
 * to Main League, no choice involved).
 */
export default function JoinPageContainer({ onJoined, onGoToSignIn }) {
  const { join } = useAuth();
  const [error, setError] = useState(null);

  return (
    <JoinPage
      error={error}
      onGoToSignIn={onGoToSignIn}
      onJoin={async (form) => {
        setError(null);
        try {
          const { joinedLeague } = await join(form);
          onJoined?.(joinedLeague);
        } catch (err) {
          setError(err.message || 'Join failed.');
        }
      }}
    />
  );
}
