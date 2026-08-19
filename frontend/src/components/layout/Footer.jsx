/** Footer — spec §6.1. `onContactAdmin` wires the "Message To Administrator" link. */
import { useT } from '../../context/I18nContext';

export default function Footer({ onContactAdmin }) {
  const t = useT();
  return (
    <footer className="mt-10 border-t border-lineSoft pt-6 pb-6 md:pb-6 pb-[90px] bg-bg1">
      <div className="max-w-[1120px] mx-auto px-4 flex items-center justify-between flex-wrap gap-3.5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Soccer Beast" className="w-[22px] h-[22px] object-contain flex-shrink-0" />
          <span className="font-display text-[15px]">SOCCER BEAST</span>
        </div>
        <button onClick={onContactAdmin} className="text-[12.5px] font-bold text-diamond">
          {t('footer.messageAdmin', 'Message To Administrator')} <span className="inline-block rtl:-scale-x-100">→</span>
        </button>
      </div>
    </footer>
  );
}
