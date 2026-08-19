/** SectionCard — bordered card with a title/description header, wraps each admin panel's sub-sections. */
export default function SectionCard({ title, description, tag, actions, children, className = '' }) {
  return (
    <div className={`bg-surface border border-line rounded-card p-4 ${className}`}>
      {(title || tag || actions) && (
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div>
            {title && (
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[15px] tracking-wide">{title}</h3>
                {tag}
              </div>
            )}
            {description && <p className="text-[11.5px] text-textMute mt-1">{description}</p>}
          </div>
          {actions && <div className="flex-shrink-0 flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
