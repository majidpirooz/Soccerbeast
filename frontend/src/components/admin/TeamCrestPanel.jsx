import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import TextField from '../ui/TextField';
import FileUploadField from '../ui/FileUploadField';
import Crest from '../ui/Crest';
import Button from '../ui/Button';

/**
 * TeamCrestPanel — spec §2.4 last bullet, §6.11 item 4.
 * `role`: 'top' | 'low'. Top Tier Admin can add/replace a crest for any
 * team; Low Tier Admin can only add a crest for a team that doesn't
 * already have one (existing-crest teams are shown but disabled for them).
 */
export default function TeamCrestPanel({ role = 'top', teams = [], onSaveCrest }) {
  const [query, setQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const filtered = teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  const selected = teams.find((t) => t.id === selectedTeamId);
  const canEditSelected = selected && (role === 'top' || !selected.crest);

  return (
    <SectionCard
      title="Team Crests"
      tag={role === 'low' ? <Tag variant="diamond">Low Tier: crest-less teams only</Tag> : <Tag variant="gold">Top Tier: any team</Tag>}
      description="PNG/JPEG/JPG upload or a direct link."
    >
      <TextField
        placeholder="Search teams…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3"
      />
      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto mb-4">
        {filtered.map((t) => {
          const locked = role === 'low' && t.crest;
          return (
            <button
              key={t.id}
              disabled={locked}
              onClick={() => setSelectedTeamId(t.id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12.5px] font-semibold ${
                selectedTeamId === t.id ? 'bg-surface2' : ''
              } ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface2'}`}
            >
              <Crest team={t} size="sm" />
              {t.name}
              {locked && <Tag variant="neutral" className="ms-auto">Has crest</Tag>}
            </button>
          );
        })}
      </div>

      {selected && canEditSelected && (
        <div className="border-t border-lineSoft pt-4">
          <div className="flex items-center gap-2.5 mb-3">
            <Crest team={selected} size="md" />
            <span className="font-bold text-[13px]">{selected.name}</span>
          </div>
          <FileUploadField
            label="New crest"
            accept="image/png,image/jpeg"
            allowLink
            onFile={(file) => onSaveCrest?.(selected.id, { file })}
            onLink={(url) => onSaveCrest?.(selected.id, { url })}
          />
          <Button className="mt-3">Save Crest</Button>
        </div>
      )}
    </SectionCard>
  );
}
