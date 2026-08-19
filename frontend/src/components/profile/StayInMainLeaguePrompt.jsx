import Button from '../ui/Button';

/**
 * StayInMainLeaguePrompt — spec §6.4: "If an Invitation Code was supplied,
 * they join that league's PredictionLeague instead — and are given the
 * option to also remain in Main League." Shown once, right after a
 * code-based join succeeds. Doesn't apply to a no-code join (which is
 * auto-added to Main League with no choice involved).
 */
export default function StayInMainLeaguePrompt({ joinedLeagueName, onStay, onLeaveMain }) {
  return (
    <div className="bg-surface border border-line rounded-card p-5 max-w-sm w-full text-center">
      <div className="font-display text-lg mb-1.5">Welcome to {joinedLeagueName}</div>
      <p className="text-[12.5px] text-textMute mb-4">
        You're also a member of Main League by default. Want to stay in both, or just {joinedLeagueName}?
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="ghost" onClick={onLeaveMain}>
          Just {joinedLeagueName}
        </Button>
        <Button onClick={onStay}>Stay in Both</Button>
      </div>
    </div>
  );
}
