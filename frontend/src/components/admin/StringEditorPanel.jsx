import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import TextField from '../ui/TextField';
import Button from '../ui/Button';

/**
 * StringEditorPanel — spec §1 ("all UI text must be stored as editable
 * strings, editable only by Top Tier Admin") and §6.11 item 7. A flat
 * key → {en, fa} table; real implementation will likely want search/
 * pagination for hundreds of strings, kept simple here since the spec
 * doesn't detail that further.
 */
export default function StringEditorPanel({ strings = [], onSave }) {
  const [query, setQuery] = useState('');
  const [edits, setEdits] = useState({});

  const filtered = strings.filter((s) => s.key.toLowerCase().includes(query.toLowerCase()));
  const valueFor = (s, lang) => edits[s.id]?.[lang] ?? s[lang];
  const setValue = (s, lang, value) =>
    setEdits((e) => ({ ...e, [s.id]: { ...e[s.id], [lang]: value } }));

  return (
    <SectionCard
      title="UI Text / String Editor"
      tag={<Tag variant="gold">Top Tier Only</Tag>}
      description="Edit any English or Persian UI string without a code deploy."
    >
      <TextField placeholder="Search by key…" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />
      <div className="flex flex-col gap-2">
        {filtered.map((s) => (
          <div key={s.id} className="grid grid-cols-1 sm:grid-cols-[160px_1fr_1fr] gap-2 items-center border-t border-dashed border-lineSoft first:border-0 py-2.5">
            <span className="font-mono text-[11px] text-textMute">{s.key}</span>
            <TextField value={valueFor(s, 'en')} onChange={(e) => setValue(s, 'en', e.target.value)} />
            <TextField dir="rtl" value={valueFor(s, 'fa')} onChange={(e) => setValue(s, 'fa', e.target.value)} />
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={() => onSave?.(edits)}>
        Save Changes
      </Button>
    </SectionCard>
  );
}
