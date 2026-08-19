import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStrings } from '../api/strings';

const I18nContext = createContext(null);

/**
 * I18nProvider -- fetches the {key: {en,fa}} dictionary once on mount and
 * exposes a t(key, fallbackEn) function. `lang` is a prop, not owned here
 * -- it already lives in App.jsx's AppShell (drives `dir="rtl"` on the app
 * root and the TopBar's FA/EN toggle), so this provider just reacts to it
 * rather than duplicating that state.
 *
 * The `fallbackEn` argument to every t() call is the actual fix for
 * incremental rollout: a key that hasn't been seeded yet (or a component
 * nobody's translated yet -- see ROADMAP.md's admin-panel scoping note)
 * renders its English fallback instead of a blank string or a raw key like
 * "nav.home". This is why every t() call site in this codebase passes two
 * arguments, not one.
 */
export function I18nProvider({ lang, children }) {
  const [dict, setDict] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getStrings()
      .then((d) => {
        setDict(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true)); // fail open -- every t() call still has its English fallback
  }, []);

  const t = useCallback(
    (key, fallbackEn) => {
      const entry = dict[key];
      if (!entry) return fallbackEn ?? key;
      const value = lang === 'fa' ? entry.fa : entry.en;
      return value || fallbackEn || entry.en || key;
    },
    [dict, lang]
  );

  return <I18nContext.Provider value={{ t, lang, loaded }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within an I18nProvider');
  return ctx.t;
}
