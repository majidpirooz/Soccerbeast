import { useState } from 'react';
import MatchHeader from '../components/matchpage/MatchHeader';
import Timeline from '../components/matchpage/Timeline';
import LineupGrid from '../components/matchpage/LineupGrid';
import StatBars from '../components/matchpage/StatBars';
import { useT } from '../context/I18nContext';

const TABS = [
  { key: 'events', tKey: 'match.events', label: 'Events' },
  { key: 'lineups', tKey: 'match.lineups', label: 'Lineups' },
  { key: 'stats', tKey: 'match.stats', label: 'Stats' },
];

/** MatchPage — spec §6.8. `match` matches the `matchDetail` shape in mock/data.js. */
export default function MatchPage({ match }) {
  const t = useT();
  const [tab, setTab] = useState('events');

  return (
    <div>
      <MatchHeader match={match} />
      <div className="max-w-[1120px] mx-auto px-4">
        <div className="flex gap-1 bg-surface border border-line rounded-[11px] p-1 my-5">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold ${
                tab === tabItem.key ? 'bg-surface2 text-gold' : 'text-textMute'
              }`}
            >
              {t(tabItem.tKey, tabItem.label)}
            </button>
          ))}
        </div>

        {tab === 'events' && <Timeline events={match.events} />}
        {tab === 'lineups' && <LineupGrid lineups={match.lineups} homeTeam={match.home} awayTeam={match.away} />}
        {tab === 'stats' && <StatBars stats={match.stats} />}
      </div>
    </div>
  );
}
