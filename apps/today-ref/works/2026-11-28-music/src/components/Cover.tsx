// 사진 대신 무늬로 그린 음반 커버. 음반마다 바탕색, 무늬색, 무늬 하나를 갖는다.
import { albumOf, type CoverArt } from "../data";

function Pattern({ art }: { art: CoverArt }) {
  const { figure } = art;
  switch (art.pattern) {
    case "grooves":
      return (
        <g fill="none" stroke={figure}>
          {[44, 38, 32, 26, 20].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} strokeWidth={r === 44 ? 2.5 : 0.8} />
          ))}
          <circle cx="50" cy="50" r="12" fill={figure} stroke="none" />
          <circle cx="50" cy="50" r="1.8" fill={art.ground} stroke="none" />
        </g>
      );
    case "sun":
      return (
        <g fill={figure}>
          <path d="M18 62a32 32 0 0 1 64 0z" />
          {[68, 75, 82, 89].map((y, index) => (
            <rect key={y} x="10" y={y} width="80" height={3.4 - index * 0.6} />
          ))}
        </g>
      );
    case "stripes":
      return (
        <g fill={figure}>
          {[14, 26, 36, 44, 50, 55, 59].map((y, index) => (
            <rect key={y} x="0" y={y} width="100" height={7 - index} />
          ))}
          <circle cx="72" cy="76" r="10" />
        </g>
      );
    case "grid":
      return (
        <g fill={figure}>
          {Array.from({ length: 16 }, (_, cell) => {
            const filled = [0, 5, 6, 9, 10, 15, 3].includes(cell);
            const x = 14 + (cell % 4) * 19;
            const y = 14 + Math.floor(cell / 4) * 19;
            return filled ? <rect key={cell} x={x} y={y} width="15" height="15" /> : <rect key={cell} x={x + 6} y={y + 6} width="3" height="3" />;
          })}
        </g>
      );
    case "wave":
      return (
        <g fill="none" stroke={figure} strokeWidth="2.4" strokeLinecap="round">
          {[30, 42, 54, 66, 78].map((y, index) => (
            <path key={y} d={`M8 ${y}q10.5 ${-9 + index * 2} 21 0t21 0 21 0 21 0`} opacity={1 - index * 0.14} />
          ))}
        </g>
      );
    case "orbit":
      return (
        <g fill="none" stroke={figure}>
          <circle cx="50" cy="50" r="15" fill={figure} stroke="none" />
          <ellipse cx="50" cy="50" rx="38" ry="13" strokeWidth="1.4" transform="rotate(-24 50 50)" />
          <ellipse cx="50" cy="50" rx="30" ry="9" strokeWidth="0.8" transform="rotate(18 50 50)" />
          <circle cx="82" cy="36" r="3.2" fill={figure} stroke="none" />
        </g>
      );
  }
}

export function CoverArtwork({ art, className }: { art: CoverArt; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="100" height="100" fill={art.ground} />
      <Pattern art={art} />
    </svg>
  );
}

export function TrackCover({ trackId, className }: { trackId: string; className?: string }) {
  return <CoverArtwork art={albumOf(trackId).cover} className={className} />;
}

// 커버가 없는 플레이리스트는 담긴 곡의 서로 다른 음반 네 개를 2×2로 모은다. 네 개가 안 되면 첫 음반 하나를 쓴다.
export function MosaicCover({ trackIds, className }: { trackIds: string[]; className?: string }) {
  const arts = [...new Map(trackIds.map((id) => [albumOf(id).id, albumOf(id).cover])).values()];
  if (arts.length === 0) {
    return (
      <div className={`grid place-items-center bg-sunken text-faint ${className ?? ""}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40%" height="40%" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      </div>
    );
  }
  if (arts.length < 4) return <CoverArtwork art={arts[0]} className={className} />;
  return (
    <div className={`grid grid-cols-2 ${className ?? ""}`} aria-hidden="true">
      {arts.slice(0, 4).map((art, index) => (
        <CoverArtwork key={index} art={art} className="size-full" />
      ))}
    </div>
  );
}
