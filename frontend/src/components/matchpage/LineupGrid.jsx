/**
 * LineupGrid — Match Page "Lineups" tab (spec §6.8). `lineups`:
 * { home: { formation, coach, players: [{num, name}] }, away: {...} }
 * `homeTeam`/`awayTeam` are Team entities, used only for the header labels.
 */
export default function LineupGrid({ lineups, homeTeam, awayTeam }) {
  return (
    <div>
      <div className="bg-surface border border-line rounded-card p-3.5 mb-3.5 text-[12.5px]">
        <b>{homeTeam?.name}</b> · {lineups.home.formation} · Coach: {lineups.home.coach}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <LineupColumn title={`${homeTeam?.name} XI`} players={lineups.home.players} />
        <LineupColumn title={`${awayTeam?.name} XI`} players={lineups.away.players} />
      </div>
    </div>
  );
}

function LineupColumn({ title, players }) {
  return (
    <div>
      <h4 className="text-xs text-textMute uppercase tracking-wide mb-2.5">{title}</h4>
      {players.map((p, i) => (
        <div key={p.num} className={`flex items-center gap-2.5 py-2 text-[12.5px] ${i > 0 ? 'border-t border-dashed border-lineSoft' : ''}`}>
          <span className="w-[22px] h-[22px] rounded-md bg-surface2 border border-line flex items-center justify-center text-[10px] font-extrabold text-textDim flex-shrink-0">
            {p.num}
          </span>
          {p.name}
        </div>
      ))}
    </div>
  );
}
