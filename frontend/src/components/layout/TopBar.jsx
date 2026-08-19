import Avatar from '../ui/Avatar';
import { useT } from '../../context/I18nContext';

const BASE_LINKS = [
  { key: 'home', tKey: 'nav.home', label: 'Home' },
  { key: 'leagues', tKey: 'nav.leagues', label: 'Leagues' },
  { key: 'predict', tKey: 'nav.prediction', label: 'Prediction' },
  { key: 'live', tKey: 'nav.live', label: 'Live' },
];

/**
 * TopBar — sticky desktop nav. Order and visibility follow spec §5.1
 * exactly: Logo | Home | Leagues | Prediction | Live | Profile | Sign In |
 * Join | FA/EN — with Profile shown only when signed in, Sign In shown
 * only when signed out, and Join always visible. Router-agnostic:
 * `activeView` is a string key and `onNavigate(key)` is called on click.
 */
export default function TopBar({ activeView, onNavigate, user, lang = 'en', onLangChange }) {
  const t = useT();
  return (
    <div className="sticky top-0 z-50 bg-bg/85 backdrop-blur-lg border-b border-lineSoft">
      <div className="max-w-[1120px] mx-auto px-4 flex items-center gap-5 h-[60px]">
        <button onClick={() => onNavigate?.('home')} className="flex items-center gap-2.5 font-display text-xl tracking-wide flex-shrink-0">
          <img src="/logo.png" alt="Soccer Beast" className="w-7 h-7 object-contain flex-shrink-0" />
          SOCCER BEAST
        </button>

        <nav className="hidden md:flex gap-1 flex-1">
          {BASE_LINKS.map((l) => (
            <button
              key={l.key}
              onClick={() => onNavigate?.(l.key)}
              className={`px-3 py-2 rounded-lg text-[13.5px] font-semibold ${
                activeView === l.key ? 'text-text bg-surface2' : 'text-textDim hover:text-text hover:bg-surface2'
              }`}
            >
              {t(l.tKey, l.label)}
            </button>
          ))}
          {user && (
            <button
              onClick={() => onNavigate?.('profile')}
              className={`px-3 py-2 rounded-lg text-[13.5px] font-semibold ${
                activeView === 'profile' ? 'text-text bg-surface2' : 'text-textDim hover:text-text hover:bg-surface2'
              }`}
            >
              {t('nav.profile', 'Profile')}
            </button>
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {!user && (
            <button
              onClick={() => onNavigate?.('signin')}
              className="px-4 py-2 rounded-lg text-[13px] font-bold border border-line text-textDim hover:text-text"
            >
              {t('nav.signIn', 'Sign In')}
            </button>
          )}
          <button onClick={() => onNavigate?.('join')} className="px-4 py-2 rounded-lg text-[13px] font-extrabold bg-gradient-to-br from-gold to-[#C99A34] text-[#1B1206]">
            {t('nav.join', 'Join')}
          </button>

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
            <button onClick={() => onNavigate?.('profile')}>
              <Avatar user={user} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
