import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import TopBar from './components/layout/TopBar';
import TabBar from './components/layout/TabBar';
import Footer from './components/layout/Footer';
import { LoadingState } from './components/ui/AsyncStates';
import StayInMainLeaguePrompt from './components/profile/StayInMainLeaguePrompt';

import HomePageContainer from './containers/HomePageContainer';
import LivePageContainer from './containers/LivePageContainer';
import LeaguesPageContainer from './containers/LeaguesPageContainer';
import MatchPageContainer from './containers/MatchPageContainer';
import PredictionPageContainer from './containers/PredictionPageContainer';
import ProfilePageContainer from './containers/ProfilePageContainer';
import AdminProfilePageContainer from './containers/AdminProfilePageContainer';
import SignInPageContainer from './containers/SignInPageContainer';
import PasswordRecoveryPageContainer from './containers/PasswordRecoveryPageContainer';
import JoinPageContainer from './containers/JoinPageContainer';

/**
 * App — top-level shell. Now genuinely thin: it owns navigation (`view`),
 * language, and which match is open, and defers every data concern to the
 * container components. `AuthProvider` wraps everything so `useAuth()`
 * works anywhere below it.
 *
 * `USE_MOCK` (see src/api/mockMode.js) is what actually decides whether
 * any of this hits a real backend — with no `VITE_API_BASE_URL` set, every
 * container above renders from `src/mock/*.js` exactly like before this
 * pass, just routed through the same async/loading/error path real data
 * will use. Set that env var once a backend exists and nothing here needs
 * to change.
 */
function AppShell() {
  const { user, restoring } = useAuth();
  const [view, setView] = useState('home');
  const [lang, setLang] = useState('en');
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [adminRole, setAdminRole] = useState('top'); // demo-only tier switch, see AuthContext's doc comment
  const [stayPrompt, setStayPrompt] = useState(null); // { name } | null, spec §6.4

  const openMatch = (match) => {
    setSelectedMatchId(match?.id ?? match);
    setView('match');
  };
  const openTeam = (team) => console.log('open team page for', team); // spec doesn't detail a Team page yet

  if (restoring) return <LoadingState label="Loading Soccer Beast…" />;

  return (
    <I18nProvider lang={lang}>
      <div dir={lang === 'fa' ? 'rtl' : 'ltr'} className="font-body pb-16">
        <TopBar activeView={view} onNavigate={setView} lang={lang} onLangChange={setLang} user={user} />
        <TabBar activeView={view} onNavigate={setView} user={user} />

        {view === 'home' && <HomePageContainer onOpenMatch={openMatch} onNavigate={setView} />}
        {view === 'live' && <LivePageContainer onOpenMatch={openMatch} />}
        {view === 'leagues' && <LeaguesPageContainer onOpenMatch={openMatch} onOpenTeam={openTeam} />}
        {view === 'match' && <MatchPageContainer matchId={selectedMatchId} />}
        {view === 'predict' && <PredictionPageContainer />}

        {view === 'profile' && user && (
          <div>
            <div className="max-w-[720px] mx-auto px-4 pt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-textMute">Demo only — admin tier:</span>
              {['user', 'top', 'low'].map((r) => (
                <button
                  key={r}
                  onClick={() => setAdminRole(r)}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border ${
                    adminRole === r ? 'bg-surface2 border-gold text-gold' : 'border-line text-textMute'
                  }`}
                >
                  {r === 'user' ? 'Regular User' : r === 'top' ? 'Top Tier Admin' : 'Low Tier Admin'}
                </button>
              ))}
            </div>

            {adminRole === 'user' ? (
              <ProfilePageContainer lang={lang} onLangChange={setLang} />
            ) : (
              <AdminProfilePageContainer role={adminRole} lang={lang} onLangChange={setLang} />
            )}
          </div>
        )}

        {view === 'signin' && (
          <SignInPageContainer
            onSignedIn={() => setView('home')}
            onGoToRecovery={() => setView('recover')}
            onGoToJoin={() => setView('join')}
          />
        )}

        {view === 'recover' && <PasswordRecoveryPageContainer onGoToSignIn={() => setView('signin')} />}

        {view === 'join' && (
          <JoinPageContainer
            onGoToSignIn={() => setView('signin')}
            onJoined={(joinedLeague) => {
              if (joinedLeague) {
                setStayPrompt({ name: joinedLeague.name });
              } else {
                setView('home');
              }
            }}
          />
        )}

        {stayPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-4">
            <StayInMainLeaguePrompt
              joinedLeagueName={stayPrompt.name}
              onStay={() => {
                setStayPrompt(null);
                setView('home');
              }}
              onLeaveMain={() => {
                console.log('leave Main League');
                setStayPrompt(null);
                setView('home');
              }}
            />
          </div>
        )}

        <Footer onContactAdmin={() => console.log('contact admin')} />
      </div>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
