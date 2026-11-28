// 상품, 팩, 재화 그림. 생성 이미지와 실사 얼굴 대신 SVG로 직접 그린다(규칙 C8).
import { useId } from "react";

import type { Art, Currency, Pack, Player, Tier } from "./data";
import { playerTier, statNames } from "./data";

export function ItemArt({ art, className }: { art: Art; className?: string }) {
  switch (art.kind) {
    case "kit":
      return <Kit art={art} className={className} />;
    case "ball":
      return <Ball art={art} className={className} />;
    case "scarf":
      return <Scarf art={art} className={className} />;
    case "banner":
      return <Banner art={art} className={className} />;
    case "armband":
      return <Armband art={art} className={className} />;
    case "flag":
      return <CornerFlag art={art} className={className} />;
  }
}

const shirtPath =
  "M62 30 L82 21 Q100 36 118 21 L138 30 L178 60 L160 92 L144 83 L144 180 L56 180 L56 83 L40 92 L22 60 Z";

function Kit({ art, className }: { art: Extract<Art, { kind: "kit" }>; className?: string }) {
  const id = useId();
  const clip = `${id}-clip`;
  const shade = `${id}-shade`;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d={shirtPath} />
        </clipPath>
        <linearGradient id={shade} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="200" height="200" fill={art.base} />
        <KitPattern art={art} />
        {/* 소매 끝단 */}
        <path d="M22 60 L40 92 L48 88 L30 56 Z M178 60 L160 92 L152 88 L170 56 Z" fill={art.trim} />
        <rect width="200" height="200" fill={`url(#${shade})`} />
      </g>
      <path d="M82 21 Q100 40 118 21" fill="none" stroke={art.trim} strokeWidth="6" strokeLinecap="round" />
      <path d={shirtPath} fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
    </svg>
  );
}

function KitPattern({ art }: { art: Extract<Art, { kind: "kit" }> }) {
  switch (art.pattern) {
    case "hoops":
      return (
        <g fill={art.second}>
          {[40, 76, 112, 148].map((y) => (
            <rect key={y} x="0" y={y} width="200" height="18" />
          ))}
        </g>
      );
    case "stripes":
      return (
        <g fill={art.second}>
          {[66, 98, 130].map((x) => (
            <rect key={x} x={x} y="0" width="16" height="200" />
          ))}
        </g>
      );
    case "sash":
      return <path d="M50 20 L82 20 L160 180 L128 180 Z" fill={art.second} />;
    case "halves":
      return <rect x="100" y="0" width="100" height="200" fill={art.second} />;
    case "chevron":
      return <path d="M40 70 L100 112 L160 70 L160 92 L100 134 L40 92 Z" fill={art.second} />;
    case "plain":
      return <rect x="56" y="168" width="88" height="12" fill={art.second} />;
  }
}

function Ball({ art, className }: { art: Extract<Art, { kind: "ball" }>; className?: string }) {
  const id = useId();
  const clip = `${id}-clip`;
  const shade = `${id}-shade`;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="100" cy="100" r="70" />
        </clipPath>
        <radialGradient id={shade} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="200" height="200" fill={art.base} />
        <g fill={art.panel}>
          <path d="M100 58 L124 76 L115 104 L85 104 L76 76 Z" />
          <path d="M30 70 Q52 66 62 86 L54 112 Q38 118 26 110 Z" />
          <path d="M170 70 Q148 66 138 86 L146 112 Q162 118 174 110 Z" />
          <path d="M78 150 Q100 136 122 150 L118 176 Q100 184 82 176 Z" />
        </g>
        <g fill="none" stroke={art.panel} strokeOpacity="0.5" strokeWidth="2">
          <path d="M76 76 L62 86 M124 76 L138 86 M85 104 L78 150 M115 104 L122 150 M54 112 L78 150 M146 112 L122 150" />
        </g>
        <rect width="200" height="200" fill={`url(#${shade})`} />
      </g>
    </svg>
  );
}

function Scarf({ art, className }: { art: Extract<Art, { kind: "scarf" }>; className?: string }) {
  const blocks = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g transform="rotate(-28 100 100)">
        {blocks.map((index) => (
          <rect key={index} x={20 + index * 20} y="78" width="20" height="44" fill={index % 2 === 0 ? art.base : art.second} />
        ))}
        <rect x="20" y="78" width="160" height="44" fill="none" stroke="#000" strokeOpacity="0.2" />
        <g stroke={art.second} strokeWidth="2.5" strokeLinecap="round">
          {[82, 90, 98, 106, 114].map((y) => (
            <g key={y}>
              <line x1="20" y1={y} x2="8" y2={y} />
              <line x1="180" y1={y} x2="192" y2={y} />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}

function Banner({ art, className }: { art: Extract<Art, { kind: "banner" }>; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g transform="rotate(-4 100 100)">
        <rect x="14" y="58" width="172" height="84" fill={art.base} />
        <rect x="14" y="58" width="172" height="12" fill={art.second} />
        <rect x="14" y="130" width="172" height="12" fill={art.second} />
        <text
          x="100"
          y="109"
          textAnchor="middle"
          fontFamily="Gothic A1, sans-serif" fontWeight="800"
          fontSize="22"
          fill={art.second}
        >
          {art.text}
        </text>
        <line x1="14" y1="52" x2="14" y2="150" stroke="#000" strokeOpacity="0.35" strokeWidth="3" />
        <line x1="186" y1="52" x2="186" y2="150" stroke="#000" strokeOpacity="0.35" strokeWidth="3" />
      </g>
    </svg>
  );
}

function Armband({ art, className }: { art: Extract<Art, { kind: "armband" }>; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <ellipse cx="100" cy="128" rx="62" ry="18" fill="#000" fillOpacity="0.25" />
      <path d="M38 80 Q100 104 162 80 L162 120 Q100 144 38 120 Z" fill={art.base} />
      <path d="M38 80 Q100 56 162 80 Q100 104 38 80 Z" fill="#000" fillOpacity="0.3" />
      <text x="100" y="124" textAnchor="middle" fontFamily="Gothic A1, sans-serif" fontWeight="800" fontSize="34" fill={art.mark}>
        C
      </text>
    </svg>
  );
}

function CornerFlag({ art, className }: { art: Extract<Art, { kind: "flag" }>; className?: string }) {
  const cells = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      cells.push(
        <rect
          key={`${row}-${column}`}
          x={72 + column * 22}
          y={36 + row * 20}
          width="22"
          height="20"
          fill={(row + column) % 2 === 0 ? art.base : art.second}
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <line x1="70" y1="32" x2="70" y2="176" stroke="#f4efe4" strokeWidth="5" strokeLinecap="round" />
      <g transform="skewY(4)">{cells}</g>
      <ellipse cx="70" cy="178" rx="26" ry="6" fill="#000" fillOpacity="0.25" />
    </svg>
  );
}

// 팩 포장. 등급의 이름과 색이 맞게 브론즈는 구리, 실버는 은, 골드는 금색이다(규칙 C8).
const sleeveColors: Record<Tier, [string, string, string]> = {
  bronze: ["#7d4b2a", "#c98a5a", "#f1c39a"],
  silver: ["#7c8590", "#c9d0d7", "#f3f6f8"],
  gold: ["#a07320", "#e2b54c", "#f8e3a0"],
};

export function PackSleeve({ pack, className }: { pack: Pack; className?: string }) {
  const id = useId();
  const foil = `${id}-foil`;
  const [dark, mid, light] = sleeveColors[pack.tier];
  const crimpTop = Array.from({ length: 12 }, (_, index) => `L${6 + index * 9 + 4.5} 10 L${6 + (index + 1) * 9} 14`).join(" ");
  const crimpBottom = Array.from({ length: 12 }, (_, index) => `L${114 - index * 9 - 4.5} 160 L${114 - (index + 1) * 9} 156`).join(" ");
  return (
    <svg viewBox="0 0 120 170" className={className} role="img" aria-label={`${pack.name} 포장`}>
      <defs>
        <linearGradient id={foil} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mid} />
          <stop offset="0.42" stopColor={light} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d={`M6 14 ${crimpTop} L114 156 ${crimpBottom} Z`} fill={`url(#${foil})`} />
      {pack.premium && <path d="M6 96 L114 62 L114 84 L6 118 Z" fill="#1f0a14" fillOpacity="0.85" />}
      <text x="60" y="58" textAnchor="middle" fontFamily="Gothic A1, sans-serif" fontWeight="800" fontSize="14" fill={dark}>
        하프라인
      </text>
      <text x="60" y="98" textAnchor="middle" fontFamily="Gothic A1, sans-serif" fontWeight="800" fontSize="40" fill={pack.premium ? light : dark}>
        27
      </text>
      <rect x="6" y="128" width="108" height="20" fill={dark} fillOpacity="0.9" />
      <text x="60" y="142" textAnchor="middle" fontFamily="Gothic A1, sans-serif" fontWeight="800" fontSize="10" fill={light}>
        {pack.premium ? "프리미엄 " : ""}
        {pack.tier === "gold" ? "골드" : pack.tier === "silver" ? "실버" : "브론즈"}
      </text>
    </svg>
  );
}

// 재화 아이콘. 같은 재화는 어디서나 이 모양 하나로 보인다.
export function CurrencyIcon({ currency, className = "size-4" }: { currency: Currency; className?: string }) {
  if (currency === "coins") {
    return (
      <svg viewBox="0 0 16 16" className={className} role="img" aria-label="코인">
        <circle cx="8" cy="8" r="7" fill="#d9e0e8" />
        <circle cx="8" cy="8" r="4.6" fill="none" stroke="#6f7a86" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={`currency-points ${className}`} role="img" aria-label="포인트">
      <path d="M8 1 L15 8 L8 15 L1 8 Z" fill="var(--accent)" />
      <path d="M8 4.5 L11.5 8 L8 11.5 L4.5 8 Z" fill="var(--accent-ink)" fillOpacity="0.35" />
    </svg>
  );
}

const cardColors: Record<Tier, { metal: string; ink: string; edge: string }> = {
  bronze: { metal: "linear-gradient(160deg, #d9a27a, #8f5a35)", ink: "#2b160a", edge: "#c98a5a" },
  silver: { metal: "linear-gradient(160deg, #e8ecf0, #9aa4ae)", ink: "#1c232b", edge: "#c9d0d7" },
  gold: { metal: "linear-gradient(160deg, #f1d68a, #b8862a)", ink: "#2a1c05", edge: "#e2b54c" },
};

// 선수 카드. 사진 대신 능력치를 크게 쓴다. 위는 등급 금속색에 능력치와 포지션, 아래 어두운 띠에 이름과 세부 능력치를 둔다.
export function PlayerCard({ player, size = "md" }: { player: Player; size?: "sm" | "md" }) {
  const tier = playerTier(player);
  const colors = cardColors[tier];
  const small = size === "sm";
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-work bg-[#15171b] ${small ? "h-[150px] w-[108px]" : "h-[196px] w-[140px]"}`}
      style={{ boxShadow: `inset 0 0 0 1px ${colors.edge}` }}
    >
      <div
        className={`relative flex flex-1 items-start justify-between ${small ? "p-2" : "p-3"}`}
        style={{ background: colors.metal, color: colors.ink }}
      >
        {player.rare && (
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: "repeating-linear-gradient(135deg, #ffffff 0 2px, transparent 2px 10px)" }}
          />
        )}
        <div className="relative leading-none">
          <div className={`font-title tabular ${small ? "text-[28px]" : "text-[36px]"}`}>{player.rating}</div>
          <div className={`mt-1 font-extrabold ${small ? "text-[11px]" : "text-[12px]"}`}>{player.position}</div>
        </div>
        <div className={`relative font-extrabold opacity-70 ${small ? "text-[10px]" : "text-[11px]"}`}>{player.nation}</div>
      </div>
      <div className={`text-ink ${small ? "px-2 pt-1.5 pb-2" : "px-3 pt-2 pb-2.5"}`}>
        <div className={`truncate font-extrabold ${small ? "text-[12px]" : "text-[14px]"}`}>{player.name}</div>
        {!small && (
          <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] leading-tight">
            {statNames.map((name, index) => (
              <div key={name} className="flex justify-between gap-1">
                <dt className="text-muted">{name}</dt>
                <dd className="tabular font-extrabold">{player.stats[index]}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
