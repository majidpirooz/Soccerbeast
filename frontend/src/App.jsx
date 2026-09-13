import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import TopBar from './components/layout/TopBar';
import TabBar from './components/layout/TabBar';
import Footer from './components/layout/Footer';
import ContactAdminModal from './components/layout/ContactAdminModal';
import { LoadingState } from './components/ui/AsyncStates';
import StayInMainLeaguePrompt from './components/profile/StayInMainLeaguePrompt';
import { submitContactMessage } from './api/contact';

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

const LANG_STORAGE_KEY = 'soccerbeast_lang';

const PAGE_TITLES = {
  '/': 'Home',
  '/live': 'Live Scores',
  '/leagues': 'Leagues',
  '/predict': 'Prediction',
  '/profile': 'Profile',
  '/signin': 'Sign In',
  '/join': 'Join',
  '/recover': 'Password Recovery',
};

/** MatchRoute -- thin adapter so MatchPageContainer (which takes a plain `matchId` prop) works under a real /match/:matchId URL. */
function MatchRoute() {
  const { matchId } = useParams();
  return <MatchPageContainer matchId={matchId} />;
}

/**
 * ProfileRoute -- fixes two real bugs at once:
 *  - #17: a "Demo only — admin tier" switcher was shown to every signed-in
 *    user, including regular ones, letting anyone flip themselves into the
 *    admin view client-side (the real backend still enforced tier-based
 *    403s, so no actual data leakage, but it was confusing and wrong UX).
 *  - #15: that same demo toggle defaulted to 'top' regardless of who was
 *    actually signed in, so it was never reliably showing the right thing
 *    for a genuinely-promoted admin either.
 * This now reads the ACTUAL signed-in user's tier and renders accordingly
 * — no toggle, no client-side override.
 */
function ProfileRoute({ lang, onLangChange }) {
  const { user } = useAuth();
  if (!user) return null; // App only renders this route's link when signed in; direct navigation while signed out is handled by the redirect below
  if (user.tier === 'admin_top') return <AdminProfilePageContainer role="top" lang={lang} onLangChange={onLangChange} />;
  if (user.tier === 'admin_low') return <AdminProfilePageContainer role="low" lang={lang} onLangChange={onLangChange} />;
  return <ProfilePageContainer lang={lang} onLangChange={onLangChange} />;
}

function AppShell() {
  const { user, restoring, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_STORAGE_KEY)) || 'en');
  const [stayPrompt, setStayPrompt] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);

  const setLangPersisted = (l) => {
    setLang(l);
    if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_STORAGE_KEY, l);
  };

  // Companion to the URL-per-page fix (#9): the browser tab title now also
  // reflects the current page, not just a static "Soccer Beast" forever.
  useEffect(() => {
    const page = PAGE_TITLES[location.pathname] || (location.pathname.startsWith('/match/') ? 'Match' : '');
    document.title = page ? `Soccer Beast — ${page}` : 'Soccer Beast';
  }, [location.pathname]);

  // Signed-out users landing on /profile get bounced to Sign In rather than
  // a blank/broken page -- there's nothing for ProfileRoute to render for them.
  useEffect(() => {
    if (!restoring && !user && location.pathname === '/profile') navigate('/signin', { replace: true });
  }, [restoring, user, location.pathname, navigate]);

  const openMatch = (match) => navigate(`/match/${match?.id ?? match}`);
  const openTeam = (team) => console.log('open team page for', team); // spec doesn't detail a Team page yet
  const goToLive = () => navigate('/live');

  if (restoring) return <LoadingState label="Loading Soccer Beast…" />;

  return (
    <I18nProvider lang={lang}>
      {/* Always `dir="ltr"` — the FA/EN toggle only swaps text via useT(),
          it never mirrors the layout. RTL mirroring was removed per explicit
          feedback: it should translate text only, not flip the page. */}
      <div dir="ltr" className="font-body min-h-screen flex flex-col">
        <TopBar user={user} lang={lang} onLangChange={setLangPersisted} onSignOut={signOut} />
        <TabBar user={user} />

        <main className="flex-1">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePageContainer onOpenMatch={openMatch} onNavigate={goToLive} />} />
              <Route path="/live" element={<LivePageContainer onOpenMatch={openMatch} />} />
              <Route path="/leagues" element={<LeaguesPageContainer onOpenMatch={openMatch} onOpenTeam={openTeam} />} />
              <Route path="/match/:matchId" element={<MatchRoute />} />
              <Route path="/predict" element={<PredictionPageContainer />} />
              <Route path="/profile" element={<ProfileRoute lang={lang} onLangChange={setLangPersisted} />} />
              <Route
                path="/signin"
                element={
                  <SignInPageContainer
                    onSignedIn={() => navigate('/')}
                    onGoToRecovery={() => navigate('/recover')}
                    onGoToJoin={() => navigate('/join')}
                  />
                }
              />
              <Route path="/recover" element={<PasswordRecoveryPageContainer onGoToSignIn={() => navigate('/signin')} />} />
              <Route
                path="/join"
                element={
                  <JoinPageContainer
                    onGoToSignIn={() => navigate('/signin')}
                    onJoined={(joinedLeague) => {
                      if (joinedLeague) setStayPrompt({ name: joinedLeague.name });
                      else navigate('/');
                    }}
                  />
                }
              />
            </Routes>
          </ErrorBoundary>
        </main>

        {stayPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-4">
            <StayInMainLeaguePrompt
              joinedLeagueName={stayPrompt.name}
              onStay={() => {
                setStayPrompt(null);
                navigate('/');
              }}
              onLeaveMain={() => {
                console.log('leave Main League');
                setStayPrompt(null);
                navigate('/');
              }}
            />
          </div>
        )}

        <ContactAdminModal
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          onSubmit={submitContactMessage}
          user={user}
        />

        <Footer onContactAdmin={() => setContactOpen(true)} />
      </div>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
