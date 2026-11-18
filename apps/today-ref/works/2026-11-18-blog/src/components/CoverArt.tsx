import type { CoverArt as Art } from "../data";

// 사진 대신 쓰는 표지 그림. 같은 글은 언제나 같은 그림이 나온다.
export function CoverArt({ art, className = "" }: { art: Art; className?: string }) {
  const base = `hsl(${art.hue} 55% 88%)`;
  const deep = `hsl(${art.hue} 45% 42%)`;
  const mid = `hsl(${(art.hue + 25) % 360} 60% 70%)`;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(140deg, ${base}, hsl(${art.hue} 50% 78%))` }} aria-hidden="true">
      <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {art.shape === "circles" ? (
          <>
            <circle cx="290" cy="120" r="78" fill={mid} />
            <circle cx="215" cy="150" r="46" fill={deep} opacity="0.85" />
            <circle cx="320" cy="60" r="18" fill="#fff" opacity="0.7" />
          </>
        ) : art.shape === "stripes" ? (
          <>
            {[0, 1, 2, 3, 4].map((index) => (
              <rect key={index} x={150 + index * 34} y={40 + index * 14} width="22" height={170 - index * 14} rx="11" fill={index % 2 ? deep : mid} opacity={0.9 - index * 0.08} />
            ))}
          </>
        ) : art.shape === "keypad" ? (
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
        ) : art.shape === "layers" ? (
          <>
            <rect x="60" y="30" width="280" height="190" rx="14" fill="#16171a" />
            <rect x="95" y="60" width="210" height="130" rx="12" fill="#22242a" />
            <rect x="150" y="95" width="150" height="80" rx="10" fill="#33363e" />
          </>
        ) : art.shape === "window" ? (
          <>
            <rect x="120" y="45" width="190" height="150" rx="14" fill="#fff" opacity="0.85" />
            <rect x="120" y="45" width="190" height="26" rx="14" fill={deep} />
            <rect x="140" y="92" width="96" height="12" rx="6" fill={mid} />
            <rect x="140" y="116" width="150" height="10" rx="5" fill={base} />
            <rect x="140" y="136" width="120" height="10" rx="5" fill={base} />
            <rect x="240" y="160" width="52" height="22" rx="11" fill={deep} />
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map((index) => (
              <rect key={index} x={130 + index * 50} y={175 - index * 38} width="50" height={38 + index * 38} fill={index % 2 ? mid : deep} opacity="0.9" />
            ))}
            <circle cx="330" cy="62" r="20" fill="#fff" opacity="0.75" />
          </>
        )}
      </svg>
    </div>
  );
}
