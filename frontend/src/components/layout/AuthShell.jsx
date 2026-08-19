/** AuthShell — shared centered-card frame for the three auth pages, keeps their layout identical. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <img src="/logo.png" alt="Soccer Beast" className="w-8 h-8 object-contain flex-shrink-0" />
          <span className="font-display text-xl tracking-wide">SOCCER BEAST</span>
        </div>

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
