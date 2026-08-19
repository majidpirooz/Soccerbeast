import { useAsync } from '../hooks/useAsync';
import { getMatch } from '../api/matches';
import { LoadingState, ErrorState } from '../components/ui/AsyncStates';
import MatchPage from '../pages/MatchPage';

export default function MatchPageContainer({ matchId }) {
  const { data, loading, error, refetch } = useAsync(() => getMatch(matchId), [matchId]);

  if (loading) return <LoadingState label="Loading match…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return <MatchPage match={data} />;
}
