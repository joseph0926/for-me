import type { FigureArt } from "../data";

// 본문이 설명하는 화면 상태를 보여 주는 도해다.
export function ArticleFigure({ art, className = "" }: { art: FigureArt; className?: string }) {
  const base = `hsl(${art.hue} 55% 88%)`;
  const deep = `hsl(${art.hue} 45% 42%)`;
  const mid = `hsl(${(art.hue + 25) % 360} 60% 70%)`;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(140deg, ${base}, hsl(${art.hue} 50% 78%))` }} aria-hidden="true">
      <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {art.shape === "keypad" ? (
          <>
            <rect x="140" y="20" width="120" height="215" rx="16" fill="#fff" opacity="0.92" />
            <rect x="154" y="44" width="92" height="22" rx="6" fill={base} />
            <text x="200" y="60" textAnchor="middle" fontSize="13" fontWeight="700" fill={deep}>12,000</text>
            <rect x="154" y="138" width="92" height="20" rx="10" fill={deep} />
            <rect x="140" y="128" width="120" height="107" rx="0" fill={`hsl(${art.hue} 15% 30%)`} opacity="0.95" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((column) => (
                <rect key={`${row}-${column}`} x={150 + column * 34} y={138 + row * 30} width="28" height="22" rx="5" fill="#fff" opacity="0.85" />
              )),
            )}
          </>
        ) : art.shape === "compare" ? (
          <>
            {[95, 215].map((x, index) => (
              <g key={x}>
                <rect x={x} y="35" width="100" height="180" rx="12" fill="#fff" opacity="0.92" />
                {index === 0 ? (
                  [0, 1, 2].map((line) => <rect key={line} x={x + 14} y={95 + line * 18} width={72 - line * 12} height="8" rx="4" fill={mid} />)
                ) : (
                  <rect x={x + 18} y="112" width="64" height="24" rx="12" fill={deep} />
                )}
              </g>
            ))}
          </>
        ) : (
          <>
            <rect x="60" y="30" width="280" height="190" rx="14" fill="#16171a" />
            <rect x="95" y="60" width="210" height="130" rx="12" fill="#22242a" />
            <rect x="150" y="95" width="150" height="80" rx="10" fill="#33363e" />
          </>
        )}
      </svg>
    </div>
  );
}
