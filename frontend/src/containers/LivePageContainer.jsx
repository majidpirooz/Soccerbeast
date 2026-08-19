import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { getLive } from '../api/live';
import { LoadingState, ErrorState } from '../components/ui/AsyncStates';
import LivePage from '../pages/LivePage';

export default function LivePageContainer({ onOpenMatch }) {
  const [activeDayId, setActiveDayId] = useState('today');
  const [liveScoresEnabled, setLiveScoresEnabled] = useState(true);

  const { data, loading, error, refetch } = useAsync(() => getLive(activeDayId), [activeDayId]);

  if (loading) return <LoadingState label="Loading live scores…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <LivePage
      days={data.days}
      activeDayId={activeDayId}
      onSelectDay={setActiveDayId}
      leagueGroups={data.leagueGroups}
      lastUpdate={data.lastUpdate}
      liveScoresEnabled={liveScoresEnabled}
      onToggleLiveScores={setLiveScoresEnabled}
      onOpenMatch={onOpenMatch}
      highlightedMatchIds={data.highlightedMatchIds}
    />
  );
}
