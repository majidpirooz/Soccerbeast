import Button from '../ui/Button';
import { useT } from '../../context/I18nContext';

/**
 * CreateLeagueCard — spec §6.11 regular-user bullet 6. Any user can become
 * a Low Tier Admin via this button (§7.6). The actual creation form
 * (league name, match-pool choice: reuse Main League's pool or curate own)
 * is out of scope for this card — it just launches that flow via
 * `onCreate`, kept separate since it likely wants its own modal/page.
 */
export default function CreateLeagueCard({ onCreate }) {
  const t = useT();
  return (
    <div className="bg-gradient-to-br from-surface to-surface2 border border-line rounded-card p-5 text-center">
      <div className="font-display text-lg mb-1.5">{t('profile.runYourOwnLeague', 'Run your own league')}</div>
      <p className="text-[12.5px] text-textMute mb-3.5 max-w-xs mx-auto">
        {t('profile.createLeagueDescription', "Pick a name, choose whether to reuse Main League's matches or curate your own, and invite friends with a code.")}
      </p>
      <Button onClick={onCreate}>{t('profile.createLeague', 'Create My League')}</Button>
    </div>
  );
}
