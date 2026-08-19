import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { getCompetitions, getSeasons, getStandings, getFixtures } from '../api/leagues';
import { LoadingState, ErrorState } from '../components/ui/AsyncStates';
import LeaguesPage from '../pages/LeaguesPage';

/**
 * LeaguesPageContainer — spec §6.5 needs a real league *dropdown*, which
 * `LeaguesPage` doesn't render yet (it only exposes `onOpenLeagueSelect`
 * as a callback with no picker UI attached). Until that picker exists,
 * this container cycles to the next competition in the list on click —
 * good enough to prove the data flow, not a real UX. Flagged here rather
 * than silently pretending it's finished.
 */
export default function LeaguesPageContainer({ onOpenMatch, onOpenTeam }) {
  const [competitionId, setCompetitionId] = useState(null);
  const [seasonId, setSeasonId] = useState(null);

  const competitions = useAsync(getCompetitions, []);
  const activeCompetitionId = competitionId || competitions.data?.[0]?.id;

  const seasons = useAsync(
    () => (activeCompetitionId ? getSeasons(activeCompetitionId) : Promise.resolve([])),
    [activeCompetitionId]
  );
  const activeSeasonId = seasonId || seasons.data?.[0]?.id;

  const standings = useAsync(
    () =>
      activeCompetitionId && activeSeasonId
        ? getStandings(activeCompetitionId, activeSeasonId)
        : Promise.resolve({ rows: [] }),
    [activeCompetitionId, activeSeasonId]
  );
  const fixtures = useAsync(
    () =>
      activeCompetitionId && activeSeasonId
        ? getFixtures(activeCompetitionId, activeSeasonId)
        : Promise.resolve({ weeks: [] }),
    [activeCompetitionId, activeSeasonId]
  );

  const loading = competitions.loading || seasons.loading || standings.loading || fixtures.loading;
  const error = competitions.error || seasons.error || standings.error || fixtures.error;

  if (loading && !standings.data) return <LoadingState label="Loading standings…" />;
  if (error) return <ErrorState error={error} onRetry={() => { competitions.refetch(); standings.refetch(); fixtures.refetch(); }} />;

  const activeCompetition = competitions.data?.find((c) => c.id === activeCompetitionId);

  return (
    <LeaguesPage
      competitionName={activeCompetition?.name || '—'}
      seasons={seasons.data || []}
      activeSeasonId={activeSeasonId}
      onSelectSeason={setSeasonId}
      onOpenLeagueSelect={() => {
        const list = competitions.data || [];
        const idx = list.findIndex((c) => c.id === activeCompetitionId);
        const next = list[(idx + 1) % list.length];
        if (next) {
          setCompetitionId(next.id);
          setSeasonId(null);
        }
      }}
      standingsRows={standings.data?.rows || []}
      weeks={fixtures.data?.weeks || []}
      onOpenTeam={onOpenTeam}
      onOpenMatch={onOpenMatch}
    />
  );
}
