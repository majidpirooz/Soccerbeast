import SectionCard from '../ui/SectionCard';
import { useT } from '../../context/I18nContext';

/**
 * PreferencesForm — spec §6.11 regular-user bullets 4-5: prediction mode
 * (Normal/Combined, see §7.4 for switch-timing rules) and language.
 * The switch-timing rule itself (forward-only, takes effect from the next
 * unpublished/unlocked match) is enforced server-side — this component
 * just submits the intent and can show `effectiveNote` back to the user.
 */
export default function PreferencesForm({ mode, onModeChange, lang, onLangChange, effectiveNote }) {
  const t = useT();
  const modeLabels = { normal: t('profile.normal', 'Normal'), combined: t('profile.combined', 'Combined') };
  return (
    <SectionCard title={t('profile.predictionAndLanguage', 'Prediction & Language')}>
      <div className="mb-4">
        <span className="block text-[11.5px] font-bold text-textDim mb-1.5">{t('profile.predictionMode', 'Prediction Mode')}</span>
        <div className="flex gap-2">
          {['normal', 'combined'].map((m) => (
            <button
              key={m}
              onClick={() => onModeChange?.(m)}
              className={`flex-1 px-3.5 py-2.5 rounded-[9px] text-xs font-bold border ${
                mode === m ? 'bg-surface2 border-gold text-gold' : 'border-line text-textDim'
              }`}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
        {effectiveNote && <p className="text-[10.5px] text-textMute mt-1.5">{effectiveNote}</p>}
      </div>

      <div>
        <span className="block text-[11.5px] font-bold text-textDim mb-1.5">{t('profile.language', 'Language')}</span>
        <div className="flex gap-2">
          {['en', 'fa'].map((l) => (
            <button
              key={l}
              onClick={() => onLangChange?.(l)}
              className={`flex-1 px-3.5 py-2.5 rounded-[9px] text-xs font-bold border ${
                lang === l ? 'bg-surface2 border-diamond text-diamond' : 'border-line text-textDim'
              }`}
            >
              {l === 'en' ? 'English' : 'فارسی'}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
