import { useT } from '../../context/I18nContext';

const BASE_LINKS = [
  { key: 'home', tKey: 'nav.home', label: 'Home' },
  { key: 'leagues', tKey: 'nav.leagues', label: 'Leagues' },
  { key: 'live', tKey: 'nav.live', label: 'Live' },
  { key: 'predict', tKey: 'nav.prediction', label: 'Predict' },
];

/**
 * TabBar — mobile-only bottom tab navigation. Hidden at md breakpoint and
 * up. The last slot follows the same signed-in/out rule as `TopBar`:
 * "Profile" when signed in, "Sign In" when signed out.
 */
export default function TabBar({ activeView, onNavigate, user }) {
  const t = useT();
  const lastTab = user
    ? { key: 'profile', tKey: 'nav.profile', label: 'Profile' }
    : { key: 'signin', tKey: 'nav.signIn', label: 'Sign In' };
  const links = [...BASE_LINKS, lastTab];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] flex bg-bg1/95 backdrop-blur-lg border-t border-lineSoft md:hidden">
      {links.map((l) => (
        <button
          key={l.key}
          onClick={() => onNavigate?.(l.key)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 pb-2 text-[10px] font-bold ${
            activeView === l.key ? 'text-gold' : 'text-textMute'
          }`}
        >
          <span className="w-[19px] h-[19px] border-[1.8px] border-current rounded-md" />
          {t(l.tKey, l.label)}
        </button>
      ))}
    </div>
  );
}
