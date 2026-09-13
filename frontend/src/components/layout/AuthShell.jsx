/**
 * AuthShell — shared centered-card frame for the three auth pages (Sign In,
 * Join, Password Recovery). Deliberately does NOT render a logo/site-name
 * header above the card — all three pages already sit right below the
 * global TopBar, which has its own logo, so a second one here was
 * redundant clutter directly on top of the form. Removed per explicit
 * feedback across all three pages.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-line rounded-card p-6">
          <h1 className="font-display text-2xl text-center">{title}</h1>
          {subtitle && <p className="text-textMute text-[12.5px] text-center mt-1.5">{subtitle}</p>}
          <div className="mt-5 flex flex-col gap-3.5">{children}</div>
        </div>

        {footer && <div className="text-center mt-4 text-[12.5px] text-textMute">{footer}</div>}
      </div>
    </div>
  );
}
