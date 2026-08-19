const STYLES = {
  w: 'bg-win text-white',
  d: 'bg-draw text-[#1b1b1b]',
  l: 'bg-loss text-white',
};
const LETTER = { w: 'W', d: 'D', l: 'L' };

/**
 * FormDots — the "Previous Matches" column on the Leagues/Standings table
 * (spec §6.5). `results` is an array of up to 5 items, each 'w' | 'd' | 'l',
 * oldest-to-newest, scoped to the single competition being viewed.
 */
export default function FormDots({ results = [], className = '' }) {
  return (
    <div className={`flex gap-1 justify-center ${className}`}>
      {results.map((r, i) => (
        <span
          key={i}
          className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-extrabold ${STYLES[r]}`}
        >
          {LETTER[r]}
        </span>
      ))}
    </div>
  );
}
