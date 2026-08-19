import { useAsync } from '../hooks/useAsync';
import { getHome } from '../api/home';
import { LoadingState, ErrorState } from '../components/ui/AsyncStates';
import HomePage from '../pages/HomePage';

/**
 * HomePageContainer — owns the data-fetching; `HomePage` itself is
 * unchanged from before this pass and has no idea an API exists.
 */
export default function HomePageContainer({ onOpenMatch, onNavigate }) {
  const { data, loading, error, refetch } = useAsync(getHome, []);

  if (loading) return <LoadingState label="Loading home…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <HomePage
      heroMatch={data.heroMatch}
      miniMatches={data.miniMatches}
      nextMatch={data.nextMatch}
      latestMatches={data.latestMatches}
      onOpenMatch={onOpenMatch}
      onNavigate={onNavigate}
    />
  );
}
