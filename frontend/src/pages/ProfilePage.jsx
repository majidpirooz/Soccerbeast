import { useState } from 'react';
import AccountSettingsForm from '../components/profile/AccountSettingsForm';
import ProgressStats from '../components/profile/ProgressStats';
import RankComparisonChart from '../components/profile/RankComparisonChart';
import PreferencesForm from '../components/profile/PreferencesForm';
import CreateLeagueCard from '../components/profile/CreateLeagueCard';
import PreviousLeaguesList from '../components/profile/PreviousLeaguesList';
import { useT } from '../context/I18nContext';

const TABS = [
  { key: 'account', tKey: 'profile.account', label: 'Account' },
  { key: 'progress', tKey: 'profile.progress', label: 'Progress' },
  { key: 'compare', tKey: 'profile.compare', label: 'Compare' },
  { key: 'preferences', tKey: 'profile.preferences', label: 'Preferences' },
  { key: 'leagues', tKey: 'profile.myLeagues', label: 'My Leagues' },
];

/**
 * ProfilePage — spec §6.11 "regular user profile" section. All seven
 * bullets from the spec are represented as sub-components; this page just
 * lays out the tab nav and forwards callbacks.
 *
 * NOTE: the tab-list loop variable is deliberately named `tab` (or `tabItem`
 * elsewhere), never `t` — `t` is reserved for useT()'s translate function
 * throughout this codebase, and shadowing it inside a .map() is an easy
 * mistake (caught once already in MatchPage.jsx during this same pass).
 */
export default function ProfilePage({
  user,
  progress,
  comparisonSeries,
  allUsers,
  mode,
  lang,
  previousLeagues,
  onSaveAccount,
  onModeChange,
  onLangChange,
  onCreateLeague,
  onAddCompareUser,
  onRemoveCompareUser,
  onViewPreviousLeague,
}) {
  const t = useT();
  const [tab, setTab] = useState('account');

  return (
    <div className="max-w-[720px] mx-auto px-4 py-6.5">
      <h1 className="font-display text-3xl mb-1">{t('profile.title', 'Profile')}</h1>
      <p className="text-textMute text-[13.5px] mb-5">{user.name}</p>

      <div className="flex gap-1 bg-surface border border-line rounded-[11px] p-1 mb-5 overflow-x-auto">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex-shrink-0 px-3.5 py-2.5 rounded-lg text-xs font-bold ${
              tab === tabItem.key ? 'bg-surface2 text-gold' : 'text-textMute'
            }`}
          >
            {t(tabItem.tKey, tabItem.label)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {tab === 'account' && <AccountSettingsForm user={user} onSave={onSaveAccount} />}
        {tab === 'progress' && (
          <ProgressStats weeklyPoints={progress.weeklyPoints} overallPoints={progress.overallPoints} history={progress.history} />
        )}
        {tab === 'compare' && (
          <RankComparisonChart series={comparisonSeries} allUsers={allUsers} onAddUser={onAddCompareUser} onRemoveUser={onRemoveCompareUser} />
        )}
        {tab === 'preferences' && (
          <PreferencesForm
            mode={mode}
            onModeChange={onModeChange}
            lang={lang}
            onLangChange={onLangChange}
            effectiveNote={t('profile.modeChangeNote', 'Mode changes apply starting from your next unlocked match — nothing already locked or finished is rescored.')}
          />
        )}
        {tab === 'leagues' && (
          <>
            <CreateLeagueCard onCreate={onCreateLeague} />
            <PreviousLeaguesList leagues={previousLeagues} onView={onViewPreviousLeague} />
          </>
        )}
      </div>
    </div>
  );
}
