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
        // NOTE: errors are deliberately NOT caught here — they propagate to
        // AccountSettingsForm's own try/catch, which is what actually shows
        // the user a real success/error message. The previous version
        // caught-and-console.error'd here, meaning the promise always
        // resolved successfully even on a real failure — the literal cause
        // of "Save Changes button does not work" (it saved fine when it
        // worked, and showed nothing at all when it didn't).
        if (avatarFile) await uploadAvatar(avatarFile);
        if (username || password) await saveAccount({ username, password });
      }}
      onCreateLeague={async () => {
        const name = window.prompt('Name your league:');
        if (!name || !name.trim()) return;
        try {
          const { league } = await createLeague(name.trim());
          // Fix for "Create My League button does not work": it previously
          // silently created a league literally named "New League" with no
          // input and no visible result at all. Now it asks for a real name
          // and — since there's nowhere in the UI yet that lists a user's
          // own active leagues (see ROADMAP.md) — surfaces the invitation
          // code directly, since that's the one thing the user actually
          // needs to go use it (share it, or enter it themselves via Join).
          window.alert(`"${league.name}" created! Invitation code: ${league.code}`);
        } catch (err) {
          window.alert(`Couldn't create the league: ${err?.message || 'something went wrong.'}`);
        }
      }}
      onAddCompareUser={(id) => setCompareIds([...effectiveCompareIds, id])}
      onRemoveCompareUser={(id) => setCompareIds(effectiveCompareIds.filter((x) => x !== id))}
      onViewPreviousLeague={(l) => console.log('view archived league', l)}
    />
  );
}
