import { useT } from '../../context/I18nContext';

const VARIANTS = {
  open: 'bg-win/15 text-win',
  locked: 'bg-gold/15 text-gold',
  live: 'bg-loss/15 text-loss',
  finished: 'bg-white/10 text-textDim',
};

const LABEL_KEYS = {
  open: ['common.open', 'Open'],
  locked: ['common.locked', 'Locked'],
  live: ['common.live', 'Live'],
  finished: ['common.finished', 'FT'],
};

/**
 * Pill — the match Status field from spec §6.10 (open / locked / live / finished).
 * Pass `label` to override the default text (e.g. show the live minute instead of "Live").
 */
export default function Pill({ status, label, className = '' }) {
  const t = useT();
  const variant = VARIANTS[status] || VARIANTS.finished;
  const [tKey, fallback] = LABEL_KEYS[status] || [];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold
        uppercase tracking-wide ${variant} ${className}`}
    >
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-loss animate-pulse" />}
      {label || (tKey ? t(tKey, fallback) : status)}
    </span>
  );
}
