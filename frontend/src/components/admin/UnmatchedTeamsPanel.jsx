import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import Button from '../ui/Button';

/**
 * UnmatchedTeamsPanel — spec §4.1. When an incoming team name from any
 * source can't be resolved via the TeamAlias table, it's flagged here
 * instead of being auto-created or fuzzy-matched (deliberately
 * conservative, to avoid silently merging two different clubs). Admin
 * resolves each row as either "link as alias of an existing team" or
 * "create a new Team record".
 */
export default function UnmatchedTeamsPanel({ items = [], onLinkAlias, onCreateTeam }) {
  return (
    <SectionCard
      title="Unmatched Team Names"
      tag={<Tag variant="loss">{items.length} pending</Tag>}
      description="Flagged by the aliasing system — never auto-matched. Resolve each as a new alias or a new team."
    >
      {items.length === 0 && <p className="text-[12.5px] text-textMute">Nothing to review.</p>}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 border border-lineSoft rounded-xl px-3.5 py-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <div className="font-bold text-[13.5px]" dir={item.language === 'fa' ? 'rtl' : 'ltr'}>
                {item.rawText}
              </div>
              <div className="text-[10.5px] text-textMute mt-0.5">
                {item.source} · seen {item.seenAt}
              </div>
            </div>
            <Button variant="ghost" onClick={() => onLinkAlias?.(item)}>
              Link as Alias
            </Button>
            <Button onClick={() => onCreateTeam?.(item)}>Create New Team</Button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
