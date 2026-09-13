import { NavLink } from 'react-router-dom';
import { useT } from '../../context/I18nContext';

const BASE_LINKS = [
  { to: '/', tKey: 'nav.home', label: 'Home' },
  { to: '/leagues', tKey: 'nav.leagues', label: 'Leagues' },
  { to: '/live', tKey: 'nav.live', label: 'Live' },
  { to: '/predict', tKey: 'nav.prediction', label: 'Predict' },
];

/**
 * TabBar — mobile-only bottom tab navigation. Hidden at md breakpoint and
 * up. The last slot follows the same signed-in/out rule as `TopBar`:
 * "Profile" when signed in, "Sign In" when signed out — this is the ONLY
 * place Sign In should render below the md breakpoint; TopBar's own Sign
 * In link is hidden there specifically to avoid the duplicate that used
 * to show on mobile / narrow-desktop windows.
 */
export default function TabBar({ user }) {
  const t = useT();
  const lastTab = user
    ? { to: '/profile', tKey: 'nav.profile', label: 'Profile' }
    : { to: '/signin', tKey: 'nav.signIn', label: 'Sign In' };
  const links = [...BASE_LINKS, lastTab];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] flex bg-bg1/95 backdrop-blur-lg border-t border-lineSoft md:hidden">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-2.5 pb-2 text-[10px] font-bold ${
              isActive ? 'text-gold' : 'text-textMute'
            }`
          }
        >
          <span className="w-[19px] h-[19px] border-[1.8px] border-current rounded-md" />
          {t(l.tKey, l.label)}
        </NavLink>
      ))}
    </div>
  );
}
