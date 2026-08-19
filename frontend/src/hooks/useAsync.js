import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useAsync — the one data-fetching primitive every page hook is built on.
 * Deliberately dependency-free (no react-query/SWR) to match the rest of
 * this library's zero-extra-install philosophy (see RankComparisonChart's
 * inline-SVG choice for the same reasoning).
 *
 * `fn` is an async function with no args (page hooks close over whatever
 * params they need); it re-runs whenever anything in `deps` changes.
 * Guards against setting state after unmount / after a newer call has
 * already landed (avoids race conditions when deps change quickly, e.g.
 * clicking through day-tabs on the Live page).
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const callId = useRef(0);

  const run = useCallback(() => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => {
        if (id === callId.current) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (id === callId.current) setState({ data: null, loading: false, error });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: run };
}
