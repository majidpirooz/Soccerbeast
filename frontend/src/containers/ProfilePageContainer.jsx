import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { getProfile, saveAccount, uploadAvatar, savePreferences, getComparison, getAllUsers, createLeague } from '../api/profile';
import { LoadingState, ErrorState } from '../components/ui/AsyncStates';
import ProfilePage from '../pages/ProfilePage';

/**
 * ProfilePageContainer — `lang` is lifted to a prop from `App.jsx` rather
 * than owned here, since it also drives `dir="rtl"` on the app root and
 * the top nav's FA/EN toggle (spec §5.1: signed-in language overrides
 * location and lives on the profile — this container is what persists it
 * via `savePreferences`, but the current *value* still needs to live above
 * both the nav and this page).
 */
export default function ProfilePageContainer({ lang, onLangChange }) {
  const [compareIds, setCompareIds] = useState(null); // null until profile loads, then seeded with [self]
  const [mode, setMode] = useState(null);

  const profile = useAsync(getProfile, []);
  const allUsers = useAsync(getAllUsers, []);

  const effectiveCompareIds = compareIds || (profile.data ? [profile.data.user.id] : []);
  const comparison = useAsync(
    () => (effectiveCompareIds.length ? getComparison(effectiveCompareIds) : Promise.resolve({ series: [] })),
    [effectiveCompareIds.join(',')]
  );

  if (profile.loading) return <LoadingState label="Loading profile…" />;
  if (profile.error) return <ErrorState error={profile.error} onRetry={profile.refetch} />;

  const effectiveMode = mode || profile.data.mode;

  return (
    <ProfilePage
      user={profile.data.user}
      progress={profile.data.progress}
      comparisonSeries={comparison.data?.series || []}
      allUsers={allUsers.data || []}
      mode={effectiveMode}
      onModeChange={(m) => {
        setMode(m);
        savePreferences({ mode: m, lang }).catch((err) => console.error('save mode failed', err));
      }}
      lang={lang}
      onLangChange={(l) => {
        onLangChange(l);
        savePreferences({ mode: effectiveMode, lang: l }).catch((err) => console.error('save lang failed', err));
      }}
      previousLeagues={profile.data.previousLeagues}
      onSaveAccount={async ({ username, password, avatarFile }) => {
        if (avatarFile) await uploadAvatar(avatarFile).catch((err) => console.error('avatar upload failed', err));
        if (username || password) await saveAccount({ username, password }).catch((err) => console.error('save account failed', err));
      }}
      onCreateLeague={async () => {
        try {
          await createLeague('New League');
        } catch (err) {
          console.error('create league failed', err);
        }
      }}
      onAddCompareUser={(id) => setCompareIds([...effectiveCompareIds, id])}
      onRemoveCompareUser={(id) => setCompareIds(effectiveCompareIds.filter((x) => x !== id))}
      onViewPreviousLeague={(l) => console.log('view archived league', l)}
    />
  );
}
