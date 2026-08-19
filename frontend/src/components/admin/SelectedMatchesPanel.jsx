import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import Button from '../ui/Button';

/**
 * SelectedMatchesPanel — spec §6.11 item 6, "Selected Matches admin view".
 * Lets admin review and unpublish matches already added to a league's
 * prediction pool — separate from picking new matches to add, which lives
 * wherever the match-selection UI is (not specified further by the spec,
 * left out of this decomposition pass).
 */
export default function SelectedMatchesPanel({ items = [], onUnpublish }) {
  return (
    <SectionCard
      title="Selected Matches"
      description="Matches currently published to a league's prediction pool. Unpublish to pull one back out."
    >
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 flex-wrap border-t border-dashed border-lineSoft first:border-0 py-2.5">
            <span className="font-bold text-[12.5px] flex-1 min-w-[160px]">{item.match}</span>
            <Tag variant="neutral">{item.week}</Tag>
            <Tag variant="diamond">{item.league}</Tag>
            <Tag variant={item.published ? 'win' : 'neutral'}>{item.published ? 'Published' : 'Draft'}</Tag>
            {item.published && (
              <Button variant="ghost" onClick={() => onUnpublish?.(item)}>
                Unpublish
              </Button>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
