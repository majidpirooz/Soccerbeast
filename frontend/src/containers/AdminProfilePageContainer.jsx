import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import * as adminApi from '../api/admin';
import { LoadingState, ErrorState } from '../components/ui/AsyncStates';
import AdminProfilePage from '../pages/AdminProfilePage';
import ProfilePageContainer from './ProfilePageContainer';

/**
 * AdminProfilePageContainer — fetches every admin-panel data source in
 * parallel via useAsync, then wires every `handlers.*` callback
 * `AdminProfilePage` expects to a real `api/admin.js` call, refetching
 * whatever list that action affects afterward.
 *
 * `role` still comes from `App.jsx`'s demo role-switcher (see
 * AuthContext's doc comment on why — a real backend puts tier on `user`
 * itself, this library just doesn't have a real backend yet).
 *
 * Note: `AdminProfilePage` also renders the regular `ProfilePage` above
 * the admin tools (every admin is also a user). To avoid fetching profile
 * data twice, this container renders `ProfilePageContainer` itself for
 * that part rather than passing raw `profileProps` through — a small
 * deliberate divergence from `AdminProfilePage`'s original `profileProps`
 * prop, documented here since it's not obvious from the diff.
 */
export default function AdminProfilePageContainer({ role, lang, onLangChange }) {
  const scraperStatus = useAsync(adminApi.getScraperStatus, []);
  const unmatchedTeams = useAsync(adminApi.getUnmatchedTeams, []);
  const competitions = useAsync(adminApi.getManualEntryCompetitions, []);
  const selectedMatches = useAsync(adminApi.getSelectedMatches, []);
  const matchPoolWeeks = useAsync(adminApi.getMatchPoolWeeks, []);
  const [matchQuery] = useState('');
  // NOTE: MatchResultsBrowser's search box is internal component state,
  // same limitation as LeaguesPageContainer's league picker (see that
  // file's doc comment) — this container can't react to what's typed
  // there, so `resultEditableMatches` is only ever fetched unfiltered.
  // Search still works, just client-side within whatever this returns.
  const resultEditableMatches = useAsync(() => adminApi.searchMatches(matchQuery), [matchQuery]);
  const teams = useAsync(adminApi.getAdminTeams, []);
  const arenas = useAsync(adminApi.getArenas, []);
  const leagues = useAsync(adminApi.getAdminLeagues, []);
  const strings = useAsync(adminApi.getUiStrings, []);
  const proxyUsers = useAsync(adminApi.getProxyUsers, []);
  const proxyLog = useAsync(adminApi.getProxyPredictionLog, []);
  const [poolLeagueId, setPoolLeagueId] = useState(null);
  const [poolWeekId, setPoolWeekId] = useState(null);

  const activePoolLeagueId = poolLeagueId || leagues.data?.[0]?.id;
  const activePoolWeekId = poolWeekId || matchPoolWeeks.data?.[0]?.id;
  const poolCandidates = useAsync(
    () =>
      activePoolLeagueId && activePoolWeekId
        ? adminApi.getMatchPoolCandidates(activePoolLeagueId, activePoolWeekId)
        : Promise.resolve([]),
    [activePoolLeagueId, activePoolWeekId]
  );

  const asyncs = [
    scraperStatus, unmatchedTeams, competitions, selectedMatches, matchPoolWeeks,
    resultEditableMatches, teams, arenas, leagues, strings, proxyUsers, proxyLog,
  ];
  const loading = asyncs.some((a) => a.loading);
  const error = asyncs.find((a) => a.error)?.error;

  if (loading) return <LoadingState label="Loading admin tools…" />;
  if (error) return <ErrorState error={error} onRetry={() => asyncs.forEach((a) => a.refetch())} />;

  return (
    <div>
      <ProfilePageContainer lang={lang} onLangChange={onLangChange} />
      <AdminToolsOnly
        role={role}
        scraperStatus={scraperStatus.data}
        unmatchedTeams={unmatchedTeams.data}
        competitions={competitions.data}
        selectedMatches={selectedMatches.data}
        matchPoolWeeks={matchPoolWeeks.data}
        resultEditableMatches={resultEditableMatches.data}
        teams={teams.data}
        arenas={arenas.data}
        leagues={leagues.data}
        strings={strings.data}
        proxyUsers={proxyUsers.data}
        proxyLog={proxyLog.data}
        refetch={{ scraperStatus, unmatchedTeams, selectedMatches, resultEditableMatches, teams, arenas, leagues, strings, proxyLog, poolCandidates }}
        poolCandidates={poolCandidates.data || []}
        poolLeagueId={activePoolLeagueId}
        setPoolLeagueId={setPoolLeagueId}
        poolWeekId={activePoolWeekId}
        setPoolWeekId={setPoolWeekId}
      />
    </div>
  );
}

/**
 * AdminToolsOnly — thin wrapper around `AdminProfilePage` that supplies an
 * empty `profileProps` (the real profile is rendered separately above by
 * `ProfilePageContainer`, see the note on the parent component) and wires
 * every handler to a real API call.
 */
function AdminToolsOnly({
  role, scraperStatus, unmatchedTeams, competitions, selectedMatches, matchPoolWeeks,
  resultEditableMatches, teams, arenas, leagues, strings, proxyUsers, proxyLog, refetch,
  poolCandidates, poolLeagueId, setPoolLeagueId, poolWeekId, setPoolWeekId,
}) {
  return (
    <AdminProfilePage
      role={role}
      profileProps={{}}
      scraperStatus={scraperStatus}
      unmatchedTeams={unmatchedTeams}
      competitions={competitions}
      selectedMatches={selectedMatches}
      matchPoolCandidates={poolCandidates}
      matchPoolWeeks={matchPoolWeeks}
      matchPoolLeagueId={poolLeagueId}
      matchPoolWeekId={poolWeekId}
      onMatchPoolLeagueChange={setPoolLeagueId}
      onMatchPoolWeekChange={setPoolWeekId}
      resultEditableMatches={resultEditableMatches}
      teams={teams}
      arenas={arenas}
      leagues={leagues}
      strings={strings}
      proxyUsers={proxyUsers}
      proxyLog={proxyLog}
      handlers={{
        onRunMatchesStatistics: () => adminApi.runMatchesStatisticsNow().then(refetch.scraperStatus.refetch),
        onSaveMatchesStatisticsSchedule: (v) => adminApi.saveMatchesStatisticsSchedule(v).then(refetch.scraperStatus.refetch),
        onUploadHtml: (f) => adminApi.uploadMatchesStatisticsFile(f, 'offline'),
        onUploadWorkbook: (f) => adminApi.uploadMatchesStatisticsFile(f, 'online'),
        onSaveLiveScoreSchedule: (v) => adminApi.saveLiveScoreSchedule(v).then(refetch.scraperStatus.refetch),
        onForceStartLiveScore: () => adminApi.forceStartLiveScore().then(refetch.scraperStatus.refetch),
        onForceStopLiveScore: () => adminApi.forceStopLiveScore().then(refetch.scraperStatus.refetch),
        onLinkAlias: (item) => adminApi.linkAlias(item.id, item.suggestedTeamId).then(refetch.unmatchedTeams.refetch),
        onCreateTeamFromUnmatched: (item) => adminApi.createTeamFromUnmatched(item.id, item.rawText).then(refetch.unmatchedTeams.refetch).then(refetch.teams.refetch),
        onManualMatchSubmit: (form) => adminApi.submitManualMatch(form).then(refetch.selectedMatches.refetch),
        onPublishToPool: (payload) => adminApi.publishToPool(payload).then(() => {
          refetch.selectedMatches.refetch();
          refetch.poolCandidates.refetch();
        }),
        onUnpublishMatch: (item) => adminApi.unpublishMatch(item.id).then(refetch.selectedMatches.refetch),
        onSaveResult: (matchId, result) => adminApi.saveMatchResult(matchId, result).then(refetch.resultEditableMatches.refetch),
        onDeleteMatch: (matchId) => adminApi.deleteMatch(matchId).then(refetch.resultEditableMatches.refetch),
        onSaveCrest: (teamId, data) => adminApi.saveCrest(teamId, data).then(refetch.teams.refetch),
        onImportArenas: (f) => adminApi.importArenas(f).then(refetch.arenas.refetch),
        onAddArena: (row) => {
          const arena = window.prompt(`New arena name for ${row.team}:`);
          if (arena) adminApi.addArena(row.id, arena).then(refetch.arenas.refetch);
        },
        onCreateLeague: (name) => adminApi.createAdminLeague(name).then(refetch.leagues.refetch),
        onFinishLeague: (l) => adminApi.finishLeague(l.id).then(refetch.leagues.refetch),
        onManageMembers: (l) => console.log('open member management for', l),
        onRegenerateCode: (l) => adminApi.regenerateLeagueCode(l.id).then(refetch.leagues.refetch),
        onSaveStrings: (edits) => adminApi.saveUiStrings(edits).then(refetch.strings.refetch),
        onSubmitProxyPrediction: (pick) => adminApi.submitProxyPrediction(pick).then(refetch.proxyLog.refetch),
      }}
    />
  );
}
