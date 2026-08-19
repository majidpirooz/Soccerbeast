/** LoadingState — centered skeleton-ish placeholder shown while a page's useAsync call is in flight. */
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-2.5 text-textMute text-[13px]">
        <span className="w-4 h-4 border-2 border-line border-t-gold rounded-full animate-spin" />
        {label}
      </div>
    </div>
  );
}

/** ErrorState — shown when a page's useAsync call rejects. `error` is an ApiError or plain Error. */
export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 px-4 text-center">
      <p className="text-[13px] text-textDim">
        {error?.message || 'Something went wrong loading this page.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-lg text-[12.5px] font-bold border border-line text-textDim">
          Try again
        </button>
      )}
    </div>
  );
}
