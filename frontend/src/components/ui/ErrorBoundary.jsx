import { Component } from 'react';

/**
 * ErrorBoundary -- without this, any uncaught error thrown while rendering
 * (e.g. a page whose data doesn't match what a component expects) unmounts
 * the entire React tree with zero visible feedback: a blank page, exactly
 * the symptom reported for the Profile page when signed in as admin.
 *
 * This doesn't fix whatever the underlying crash's root cause is -- it
 * can't, without seeing the actual browser console error, which isn't
 * available in this environment. What it does is turn "blank page, no
 * information" into "visible error + reload button + (in dev) the actual
 * message", so the *next* time something like this happens, it's
 * immediately diagnosable instead of a silent blank screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Soccer Beast crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-surface border border-loss/30 rounded-card p-6 text-center">
            <div className="font-display text-lg mb-2 text-loss">Something went wrong</div>
            <p className="text-[12.5px] text-textMute mb-4">
              This page hit an error and couldn't display. Reloading usually fixes it — if it keeps
              happening, the browser console (F12) will have the real error to report.
            </p>
            {import.meta.env?.DEV && (
              <pre className="text-[10px] text-loss/80 text-left overflow-auto max-h-32 mb-4 bg-bg1 rounded-lg p-2">
                {String(this.state.error?.stack || this.state.error)}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-[12.5px] font-bold bg-gradient-to-br from-gold to-[#C99A34] text-[#1B1206]"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
