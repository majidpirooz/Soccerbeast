import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { getMyPredictionLeagues, getLeaderboard, getMatchesToPredict, submitPrediction } from '../api/predictions';
import { LoadingState, ErrorState } from '../components/ui/AsyncStates';
import PredictionPage from '../pages/PredictionPage';

export default function PredictionPageContainer() {
  const [leagueId, setLeagueId] = useState(null);

  const leagues = useAsync(getMyPredictionLeagues, []);
  const activeLeagueId = leagueId || leagues.data?.[0]?.id;

  const leaderboard = useAsync(
    () => (activeLeagueId ? getLeaderboard(activeLeagueId) : Promise.resolve({ rows: [] })),
    [activeLeagueId]
  );
  const matchesToPredict = useAsync(
    () => (activeLeagueId ? getMatchesToPredict(activeLeagueId) : Promise.resolve([])),
    [activeLeagueId]
  );

  const loading = leagues.loading || leaderboard.loading || matchesToPredict.loading;
  const error = leagues.error || leaderboard.error || matchesToPredict.error;

  if (loading && !leaderboard.data) return <LoadingState label="Loading predictions…" />;
  if (error) return <ErrorState error={error} onRetry={() => { leagues.refetch(); leaderboard.refetch(); matchesToPredict.refetch(); }} />;

  return (
    <PredictionPage
      predictionLeagues={leagues.data || []}
      activeLeagueId={activeLeagueId}
      onSelectLeague={setLeagueId}
      leaderboardRows={leaderboard.data?.rows || []}
      lockLabel="2d 4h"
      matchesToPredict={matchesToPredict.data || []}
      onSavePrediction={async (match, picks) => {
        try {
          await submitPrediction({ leagueId: activeLeagueId, matchId: match.id, picks });
          leaderboard.refetch();
        } catch (err) {
          console.error('save prediction failed', err);
        }
      }}
    />
  );
}
