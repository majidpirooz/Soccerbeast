import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import Toggle from '../ui/Toggle';
import TextField from '../ui/TextField';
import Button from '../ui/Button';

/**
 * LiveScoreApiPanel — spec §2.3 / §6.11 item 2. Top Tier only.
 *
 * The schedule itself is NOT user-editable start/stop *times* in the usual
 * sense — per spec it's rule-based: starts 00:00 daily for 5 minutes to
 * gather the day's match list, restarts 15 min before the day's soonest
 * match, polls every 30s until 10 min after the day's last match ends
 * (accounting for matches that run past midnight). What's actually
 * editable per spec is: the daily start time, the pre-match lead time, the
 * post-match linger time, and the polling interval — all wired here.
 */
export default function LiveScoreApiPanel({ status, onSave, onForceStart, onForceStop }) {
  const [dailyStartTime, setDailyStartTime] = useState(status.dailyStartTime);
  const [preMatchLeadMinutes, setPreMatchLeadMinutes] = useState(status.preMatchLeadMinutes);
  const [postMatchLingerMinutes, setPostMatchLingerMinutes] = useState(status.postMatchLingerMinutes);
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState(status.pollIntervalSeconds);

  return (
    <SectionCard
      title="Live Score API"
      tag={<Tag variant="gold">Top Tier Only</Tag>}
      description="varzesh3.com scraper (Persian). Drives live match events, pre-match lineups, and post-match stats."
      actions={
        <>
          <Button variant="ghost" onClick={onForceStop}>Force Stop</Button>
          <Button variant="ghost" onClick={onForceStart}>Force Start</Button>
        </>
      }
    >
      <div className="flex items-center gap-2 mb-4 text-[12px] text-textMute">
        <Tag variant={status.running ? 'win' : 'neutral'}>{status.running ? 'Running' : 'Idle'}</Tag>
        <span>
          Last tick: <b className="text-text">{status.lastTick}</b>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField
          label="Daily start time"
          type="time"
          value={dailyStartTime}
          onChange={(e) => setDailyStartTime(e.target.value)}
          hint="Runs 5 min to gather the day's match list, then stops."
        />
        <TextField
          label="Polling interval (seconds)"
          type="number"
          min="5"
          value={pollIntervalSeconds}
          onChange={(e) => setPollIntervalSeconds(e.target.value)}
          hint="How often live events are fetched once a match window is active."
        />
        <TextField
          label="Pre-match lead time (minutes)"
          type="number"
          min="0"
          value={preMatchLeadMinutes}
          onChange={(e) => setPreMatchLeadMinutes(e.target.value)}
          hint="Restarts this many minutes before the day's soonest match."
        />
        <TextField
          label="Post-match linger (minutes)"
          type="number"
          min="0"
          value={postMatchLingerMinutes}
          onChange={(e) => setPostMatchLingerMinutes(e.target.value)}
          hint="Stops this many minutes after the day's last match ends."
        />
      </div>

      <p className="text-[10.5px] text-textMute mt-3 leading-relaxed">
        Note: a day's matches may run past midnight — the stop logic accounts for matches still in
        progress at day rollover and will not cut them off. This isn't configurable; it's built into
        the scheduler.
      </p>

      <Button
        className="mt-3.5"
        onClick={() =>
          onSave?.({ dailyStartTime, preMatchLeadMinutes, postMatchLingerMinutes, pollIntervalSeconds })
        }
      >
        Save Schedule
      </Button>
    </SectionCard>
  );
}
