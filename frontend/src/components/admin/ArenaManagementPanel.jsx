import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import FileUploadField from '../ui/FileUploadField';
import Button from '../ui/Button';

/**
 * ArenaManagementPanel — spec §9 / §6.11 item 5. Bulk import is Top-Tier
 * only (an Excel workbook of team → arena list); the default match arena
 * is the home team's first-listed arena, with per-match override handled
 * inside ManualMatchEntryPanel / the match-edit flow, not here.
 */
export default function ArenaManagementPanel({ arenas = [], onImport, onAddArena }) {
  return (
    <SectionCard
      title="Arenas"
      tag={<Tag variant="gold">Bulk import: Top Tier Only</Tag>}
      description="A team may have multiple registered arenas; the first-listed one is the default match arena."
    >
      <FileUploadField
        label="Bulk import (Excel)"
        accept=".xlsx,.xls"
        hint="One row per team, arena list in adjacent columns."
        onFile={onImport}
      />

      <div className="border-t border-lineSoft mt-4 pt-4">
        <div className="flex flex-col gap-2">
          {arenas.map((row) => (
            <div key={row.id} className="flex items-center gap-3 flex-wrap text-[12.5px] py-1.5 border-t border-dashed border-lineSoft first:border-0">
              <span className="font-bold w-32 flex-shrink-0">{row.team}</span>
              <div className="flex flex-wrap gap-1.5">
                {row.arenas.map((a, i) => (
                  <Tag key={a} variant={i === 0 ? 'gold' : 'neutral'}>
                    {a}
                    {i === 0 ? ' · default' : ''}
                  </Tag>
                ))}
              </div>
              <button onClick={() => onAddArena?.(row)} className="text-[11px] font-bold text-diamond ms-auto">
                + Add arena
              </button>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
