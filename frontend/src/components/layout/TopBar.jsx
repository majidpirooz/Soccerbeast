import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import { useT } from '../../context/I18nContext';

const BASE_LINKS = [
  { to: '/', tKey: 'nav.home', label: 'Home' },
  { to: '/leagues', tKey: 'nav.leagues', label: 'Leagues' },
  { to: '/predict', tKey: 'nav.prediction', label: 'Prediction' },
  { to: '/live', tKey: 'nav.live', label: 'Live' },
];

/**
 * TopBar — sticky desktop nav. Order and visibility follow spec §5.1:
 * Logo | Home | Leagues | Prediction | Live | Profile | Sign In/Log out |
 * Join | FA/EN.
 *
 * Fixes from the pre-deployment bug list:
 * - Logo doubled in size (was barely visible at 28px).
 * - The inline "Sign In" button here is now hidden below the `md`
 *   breakpoint — `TabBar` already shows a "Sign In" tab on mobile /
 *   narrow-desktop, so both together were rendering it twice.
 * - Sign In / Join sized to match the EN/FA toggle (were noticeably larger).
 * - Join uses the diamond accent instead of gold, so it doesn't visually
 *   compete with gold's meaning elsewhere (trophies, primary actions) —
 *   and once signed in, this same button becomes "Log out" instead of
 *   staying "Join" forever, which is what a signed-in user actually needs.
 */
export default function TopBar({ user, lang = 'en', onLangChange, onSignOut }) {
  const t = useT();
  return (
    <div className="sticky top-0 z-50 bg-bg/85 backdrop-blur-lg border-b border-lineSoft">
      <div className="max-w-[1120px] mx-auto px-4 flex items-center gap-5 h-[68px]">
        <Link to="/" className="flex items-center gap-2.5 font-display text-xl tracking-wide flex-shrink-0">
          <img src="/logo.png" alt="Soccer Beast" className="w-14 h-14 object-contain flex-shrink-0" />
          SOCCER BEAST
        </Link>

        <nav className="hidden md:flex gap-1 flex-1">
          {BASE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 rounded-lg text-[13.5px] font-semibold text-textDim hover:text-text hover:bg-surface2"
            >
              {t(l.tKey, l.label)}
            </Link>
          ))}
          {user && (
            <Link to="/profile" className="px-3 py-2 rounded-lg text-[13.5px] font-semibold text-textDim hover:text-text hover:bg-surface2">
              {t('nav.profile', 'Profile')}
            </Link>
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {!user && (
            <Link
              to="/signin"
              className="hidden md:inline-flex px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-line text-textDim hover:text-text"
            >
              {t('nav.signIn', 'Sign In')}
            </Link>
          )}
          {user ? (
            <button
              onClick={onSignOut}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border border-loss/40 text-loss hover:bg-loss/10"
            >
              {t('nav.signOut', 'Sign Out')}
            </button>
          ) : (
            <Link to="/join" className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold bg-diamond text-[#0A2A2E]">
              {t('nav.join', 'Join')}
            </Link>
          )}

          <div className="flex border border-line rounded-lg overflow-hidden text-[11px] font-extrabold">
            {['en', 'fa'].map((l) => (
              <button
                key={l}
                onClick={() => onLangChange?.(l)}
                className={`px-2 py-1.5 ${lang === l ? 'bg-surface2 text-gold' : 'text-textMute'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {user && (
            <Link to="/profile">
              <Avatar user={user} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
