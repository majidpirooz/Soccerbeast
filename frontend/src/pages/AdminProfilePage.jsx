import { useState } from 'react';
import ProfilePage from './ProfilePage';
import Tag from '../components/ui/Tag';

import MatchesStatisticsPanel from '../components/admin/MatchesStatisticsPanel';
import LiveScoreApiPanel from '../components/admin/LiveScoreApiPanel';
import UnmatchedTeamsPanel from '../components/admin/UnmatchedTeamsPanel';
import ManualMatchEntryPanel from '../components/admin/ManualMatchEntryPanel';
import SelectedMatchesPanel from '../components/admin/SelectedMatchesPanel';
import MatchPoolPickerPanel from '../components/admin/MatchPoolPickerPanel';
import MatchResultsBrowser from '../components/admin/MatchResultsBrowser';
import TeamCrestPanel from '../components/admin/TeamCrestPanel';
import ArenaManagementPanel from '../components/admin/ArenaManagementPanel';
import LeagueManagementPanel from '../components/admin/LeagueManagementPanel';
import StringEditorPanel from '../components/admin/StringEditorPanel';
import ProxyPredictionPanel from '../components/admin/ProxyPredictionPanel';

const ADMIN_GROUPS = [
  { key: 'data-sources', label: 'Data Sources' },
  { key: 'matches', label: 'Matches' },
  { key: 'teams-arenas', label: 'Teams & Arenas' },
  { key: 'leagues', label: 'Leagues' },
  { key: 'content', label: 'Content' },
  { key: 'predictions', label: 'Predictions' },
];

/**
 * AdminProfilePage — spec §6.11. `role`: 'top' | 'low'. Wraps the regular
 * ProfilePage (every admin is also a user with their own account/progress/
 * preferences) and adds an "Admin Tools" section beneath it. Panels that
 * are Top-Tier-only per spec are hidden entirely for Low Tier admins
 * rather than shown-disabled, since a Low Tier admin has no legitimate
 * reason to see e.g. the Live Score API schedule.
 *
 * All the `*Data` props are passed straight through to the relevant
 * panels — see each panel's own file for its expected shape (and
 * `src/mock/adminData.js` for example values).
 */
export default function AdminProfilePage({
  role = 'top',
  profileProps,
  scraperStatus,
  unmatchedTeams,
  competitions,
  selectedMatches,
  matchPoolCandidates,
  matchPoolWeeks,
  matchPoolLeagueId,
  matchPoolWeekId,
  onMatchPoolLeagueChange,
  onMatchPoolWeekChange,
  resultEditableMatches,
  teams,
  arenas,
  leagues,
  strings,
  proxyUsers,
  proxyLog,
  handlers = {},
}) {
  const [group, setGroup] = useState('data-sources');
  const isTop = role === 'top';

  return (
    <div>
      <ProfilePage {...profileProps} />

      <div className="max-w-[960px] mx-auto px-4 pb-10">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-display text-xl">Admin Tools</h2>
          <Tag variant={isTop ? 'gold' : 'diamond'}>{isTop ? 'Top Tier Admin' : 'Low Tier Admin'}</Tag>
        </div>
        <p className="text-textMute text-[12.5px] mb-4">
          {isTop ? 'Full platform control.' : "Scoped to leagues you manage, plus teams that don't have a crest yet."}
        </p>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
          {ADMIN_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-[10px] text-xs font-bold border ${
                group === g.key ? 'bg-surface2 border-gold text-gold' : 'border-line text-textDim'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {group === 'data-sources' && isTop && (
            <>
              <MatchesStatisticsPanel
                status={scraperStatus.matchesStatistics}
                onRunNow={handlers.onRunMatchesStatistics}
                onSaveSchedule={handlers.onSaveMatchesStatisticsSchedule}
                onUploadHtml={handlers.onUploadHtml}
                onUploadWorkbook={handlers.onUploadWorkbook}
              />
              <LiveScoreApiPanel
                status={scraperStatus.liveScoreApi}
                onSave={handlers.onSaveLiveScoreSchedule}
                onForceStart={handlers.onForceStartLiveScore}
                onForceStop={handlers.onForceStopLiveScore}
              />
              <UnmatchedTeamsPanel items={unmatchedTeams} onLinkAlias={handlers.onLinkAlias} onCreateTeam={handlers.onCreateTeamFromUnmatched} />
            </>
          )}
          {group === 'data-sources' && !isTop && (
            <p className="text-[12.5px] text-textMute">Data source control is limited to Top Tier Admin.</p>
          )}

          {group === 'matches' && (
            <>
              <ManualMatchEntryPanel competitions={competitions} onSubmit={handlers.onManualMatchSubmit} />
              <MatchPoolPickerPanel
                leagues={leagues}
                weeks={matchPoolWeeks}
                candidates={matchPoolCandidates}
                onPublish={handlers.onPublishToPool}
                leagueId={matchPoolLeagueId}
                weekId={matchPoolWeekId}
                onLeagueChange={onMatchPoolLeagueChange}
                onWeekChange={onMatchPoolWeekChange}
              />
              <SelectedMatchesPanel items={selectedMatches} onUnpublish={handlers.onUnpublishMatch} />
              <MatchResultsBrowser
                matches={resultEditableMatches}
                onSaveResult={handlers.onSaveResult}
                onDeleteMatch={handlers.onDeleteMatch}
              />
            </>
          )}

          {group === 'teams-arenas' && (
            <>
              <TeamCrestPanel role={role} teams={teams} onSaveCrest={handlers.onSaveCrest} />
              {isTop && <ArenaManagementPanel arenas={arenas} onImport={handlers.onImportArenas} onAddArena={handlers.onAddArena} />}
            </>
          )}

          {group === 'leagues' && (
            <LeagueManagementPanel
              role={role}
              leagues={leagues}
              onCreateLeague={handlers.onCreateLeague}
              onFinishLeague={handlers.onFinishLeague}
              onToggleMember={handlers.onManageMembers}
              onRegenerateCode={handlers.onRegenerateCode}
            />
          )}

          {group === 'content' && isTop && <StringEditorPanel strings={strings} onSave={handlers.onSaveStrings} />}
          {group === 'content' && !isTop && (
            <p className="text-[12.5px] text-textMute">The UI text editor is limited to Top Tier Admin.</p>
          )}

          {group === 'predictions' && isTop && (
            <ProxyPredictionPanel users={proxyUsers} log={proxyLog} onSubmit={handlers.onSubmitProxyPrediction} />
          )}
          {group === 'predictions' && !isTop && (
            <p className="text-[12.5px] text-textMute">Proxy prediction entry is limited to Top Tier Admin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
