import { useState } from 'react';
import SelectField from '../ui/SelectField';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import Crest from '../ui/Crest';
import Button from '../ui/Button';

/**
 * ProxyPredictionPanel — spec §6.9 / §6.11 item 8. Top Tier Admin can
 * enter a prediction for any user, before/during/after a match — the
 * "user texted in a pick" case. Every entry is logged (who/when/what) and
 * surfaces in the affected user's own prediction history explicitly
 * marked "entered by admin" — see `PredictionCard`'s `enteredByAdmin` prop
 * on the user-facing side; `log` here is the admin-facing audit view of
 * the same data.
 */
export default function ProxyPredictionPanel({ users = [], match, log = [], onSubmit }) {
  const [userId, setUserId] = useState(users[0]?.id || '');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');

  return (
    <SectionCard
      title="Proxy Prediction Entry"
      tag={<Tag variant="gold">Top Tier Only</Tag>}
      description="Enter a pick on a user's behalf. Logged with who/when/what and shown to the user as “entered by admin”."
    >
      {match && (
        <div className="flex items-center gap-2.5 mb-3.5 text-[13px] font-bold">
          <Crest team={match.home} size="sm" /> {match.home?.name} vs {match.away?.name} <Crest team={match.away} size="sm" />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label="User"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          className="min-w-[160px]"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            className="w-[46px] h-[46px] rounded-[10px] bg-surface2 border border-line text-center font-display text-xl focus:outline-none focus:border-gold"
          />
          <span className="text-textMute font-extrabold">–</span>
          <input
            type="number"
            min="0"
            value={away}
            onChange={(e) => setAway(e.target.value)}
            className="w-[46px] h-[46px] rounded-[10px] bg-surface2 border border-line text-center font-display text-xl focus:outline-none focus:border-gold"
          />
        </div>
        <Button onClick={() => onSubmit?.({ userId, home, away })}>Submit Pick</Button>
      </div>

      <div className="border-t border-lineSoft mt-4 pt-4">
        <h4 className="text-[11px] uppercase tracking-wide text-textMute mb-2">Recent proxy entries</h4>
        <div className="flex flex-col gap-1.5">
          {log.map((entry) => (
            <div key={entry.id} className="text-[12px] text-textDim flex flex-wrap gap-x-2">
              <b>{entry.user}</b>
              <span className="text-textMute">picked</span>
              <b className="text-gold">{entry.pick}</b>
              <span className="text-textMute">for {entry.match} · by {entry.enteredBy} · {entry.at}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
