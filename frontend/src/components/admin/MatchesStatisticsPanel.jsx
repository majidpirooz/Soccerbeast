import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import Tag from '../ui/Tag';
import Toggle from '../ui/Toggle';
import TextField from '../ui/TextField';
import FileUploadField from '../ui/FileUploadField';
import Button from '../ui/Button';

/**
 * MatchesStatisticsPanel — spec §2.1 / §6.11 item 1. Top Tier only.
 * Two independent input modes: offline (upload saved HTML files) and
 * online (an Excel workbook of team links, multi-sheet). Only supports
 * league-format (round-robin) competitions — see spec §2.4 for the
 * cup/knockout manual-entry path, handled by ManualMatchEntryPanel instead.
 */
export default function MatchesStatisticsPanel({ status, onRunNow, onSaveSchedule, onUploadHtml, onUploadWorkbook }) {
  const [mode, setMode] = useState(status.mode);
  const [scheduled, setScheduled] = useState(status.scheduled);
  const [cron, setCron] = useState(status.scheduleCron);

  return (
    <SectionCard
      title="MatchesStatistics"
      tag={<Tag variant="gold">Top Tier Only</Tag>}
      description="Scrapes team Matches + team-statistic pages from football360.ir. League-format competitions only."
      actions={<Button variant="ghost" onClick={onRunNow}>Run Now</Button>}
    >
      <div className="flex items-center gap-4 mb-2 text-[12px] text-textMute flex-wrap">
        <span>
          Last run: <b className="text-text">{status.lastRun || 'never'}</b>
        </span>
        <Tag variant={status.lastResult === 'success' ? 'win' : status.lastResult === 'never run' ? 'neutral' : 'loss'}>{status.lastResult}</Tag>
        <span>
          Teams registered: <b className="text-text">{status.teamsRegistered ?? '—'}</b>
        </span>
      </div>
      {status.lastRunDetail && (
        <pre className="text-[10.5px] text-textMute bg-bg1 rounded-lg p-2.5 mb-4 overflow-auto max-h-24 whitespace-pre-wrap">
          {status.lastRunDetail}
        </pre>
      )}

      <div className="flex gap-2 mb-4">
        {['offline', 'online'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3.5 py-2 rounded-[9px] text-xs font-bold border capitalize ${
              mode === m ? 'bg-surface2 border-gold text-gold' : 'border-line text-textDim'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'offline' ? (
        <FileUploadField
          label="Saved HTML files"
          accept=".html,.htm"
          multiple
          hint="Upload every saved football360.ir page for the team(s) you want to process — each team needs its own Matches and/or team-statistic page, and teams must already be registered via the online mode's workbook at least once."
          onFile={onUploadHtml}
        />
      ) : (
        <FileUploadField
          label="Team-links workbook"
          accept=".xlsx,.xls"
          hint="Multi-sheet Excel workbook — one sheet per league, each row a team profile link. Upload this first, before either scraping mode can find any teams to process."
          onFile={onUploadWorkbook}
        />
      )}

      <div className="border-t border-lineSoft mt-4 pt-4">
        <Toggle checked={scheduled} onChange={setScheduled} label="Run on a schedule" />
        {scheduled && (
          <TextField
            label="Schedule (cron expression)"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            hint="e.g. “0 0 * * *” — daily at midnight."
            className="mt-3 max-w-xs"
          />
        )}
        <Button className="mt-3.5" onClick={() => onSaveSchedule?.({ mode, scheduled, cron })}>
          Save
        </Button>
      </div>
    </SectionCard>
  );
}
