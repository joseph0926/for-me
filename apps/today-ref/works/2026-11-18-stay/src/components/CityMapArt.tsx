import { memo } from "react";

// 서울 도심을 단순화한 지도 그림. 실제 축척과 도로 위치는 따르지 않고, 한강과 주요 동네의 위치 관계만 맞춘다.
// 좌표계는 1000 x 1000이며 data.ts의 숙소 좌표와 같다. 칸이 그림보다 넓거나 길어도 빈 곳이 보이지 않게 바탕과 강, 큰길은 바깥까지 이어 그린다.

const COLORS = {
  land: "#f1efe9",
  street: "#ffffff",
  water: "#c7dbe5",
  waterLabel: "#6f93a8",
  park: "#d9e7cf",
  mountain: "#cddfc0",
  palace: "#e8e1d0",
  roadCasing: "#dcd6c9",
  road: "#ffffff",
  highway: "#fdf6e3",
  highwayCasing: "#e3d7b6",
  district: "#9a958a",
  landmark: "#7f8a74",
};

const RIVER =
  "M -1500 604 L -20 590 C 80 570, 150 560, 230 585 C 320 612, 400 660, 480 668 C 560 676, 610 640, 680 610 C 740 585, 790 590, 850 612 C 910 634, 960 640, 1020 630 L 2500 640";

const HIGHWAYS = [
  // 강변북로
  "M -1500 567 L -20 553 C 80 533, 150 523, 230 548 C 320 575, 400 623, 480 631 C 560 639, 610 603, 680 573 C 740 548, 790 553, 850 575 C 910 597, 960 603, 1020 593 L 2500 603",
  // 올림픽대로
  "M -1500 641 L -20 627 C 80 607, 150 597, 230 622 C 320 649, 400 697, 480 705 C 560 713, 610 677, 680 647 C 740 622, 790 627, 850 649 C 910 671, 960 677, 1020 667 L 2500 677",
  // 내부순환로
  "M 120 470 C 160 330, 260 170, 420 120 C 560 80, 700 120, 800 200 C 880 270, 870 380, 820 470",
];

const ROADS = [
  "M 150 390 C 260 335, 360 318, 470 318 L 2500 280",
  "M 380 382 C 450 396, 520 404, 620 400 L 2500 380",
  "M 470 110 L 480 330 C 486 380, 470 420, 440 452",
  "M 660 230 C 650 350, 640 450, 640 560 L 636 720",
  "M 470 330 C 420 420, 360 500, 320 600 L 296 720",
  "M 110 476 C 200 432, 260 400, 330 332 C 360 302, 400 272, 440 262",
  "M 300 362 L 250 190",
  "M 560 470 L 584 760",
  "M 150 520 L 172 720",
  "M 700 520 L 704 720",
  "M 804 520 L 860 2500",
  "M 520 820 C 640 806, 800 800, 1020 790 L 2500 770",
  "M 600 700 L 570 2500",
  "M -1500 920 L -20 900 C 300 880, 600 900, 1020 872 L 2500 850",
  "M 280 690 C 380 760, 480 800, 560 812",
  "M 900 200 L 960 560",
  "M -1500 790 L 0 760 C 120 740, 200 730, 300 760",
];

const DISTRICTS: { name: string; x: number; y: number }[] = [
  { name: "마포구", x: 128, y: 372 },
  { name: "서대문구", x: 300, y: 196 },
  { name: "종로구", x: 640, y: 160 },
  { name: "동대문구", x: 760, y: 250 },
  { name: "용산구", x: 410, y: 560 },
  { name: "성동구", x: 770, y: 396 },
  { name: "광진구", x: 920, y: 470 },
  { name: "영등포구", x: 210, y: 790 },
  { name: "동작구", x: 420, y: 780 },
  { name: "서초구", x: 560, y: 930 },
  { name: "강남구", x: 690, y: 870 },
  { name: "송파구", x: 920, y: 900 },
];

function CityMapArtBase() {
  return (
    <svg viewBox="0 0 1000 1000" overflow="visible" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="map-streets" width="34" height="27" patternUnits="userSpaceOnUse" patternTransform="rotate(11)">
          <path d="M0 0.8H34M0.8 0V27" stroke={COLORS.street} strokeWidth="1.6" opacity="0.9" />
        </pattern>
        <pattern id="map-streets-south" width="40" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
          <path d="M0 0.8H40M0.8 0V30" stroke={COLORS.street} strokeWidth="1.6" opacity="0.9" />
        </pattern>
      </defs>

      <rect x="-1500" y="-1500" width="4000" height="4000" fill={COLORS.land} />
      <rect x="-1500" y="-1500" width="4000" height="2120" fill="url(#map-streets)" />
      <rect x="-1500" y="620" width="4000" height="1880" fill="url(#map-streets-south)" />

      {/* 산과 공원 */}
      <path
        d="M300 200 C 270 140, 330 60, 420 52 C 520 44, 580 86, 560 150 C 540 196, 470 176, 410 206 C 360 230, 320 230, 300 200 Z"
        fill={COLORS.mountain}
      />
      <ellipse cx="466" cy="472" rx="64" ry="40" transform="rotate(-14 466 472)" fill={COLORS.mountain} />
      <ellipse cx="724" cy="558" rx="44" ry="22" transform="rotate(-10 724 558)" fill={COLORS.park} />
      <ellipse cx="908" cy="760" rx="58" ry="42" fill={COLORS.park} />
      <ellipse cx="104" cy="512" rx="62" ry="30" transform="rotate(-8 104 512)" fill={COLORS.park} />
      <rect x="438" y="140" width="56" height="56" rx="3" fill={COLORS.palace} />
      <rect x="560" y="196" width="60" height="44" rx="3" fill={COLORS.park} />

      {/* 물길 */}
      <path d="M 40 2500 L 60 1020 C 80 850, 110 720, 122 600" stroke={COLORS.water} strokeWidth="14" fill="none" />
      <path d="M 830 -1500 L 806 -20 C 796 160, 816 300, 796 420 C 782 500, 766 560, 750 604" stroke={COLORS.water} strokeWidth="14" fill="none" />
      <path d="M 430 334 C 520 344, 620 350, 700 380 C 740 396, 770 420, 796 436" stroke={COLORS.water} strokeWidth="4" fill="none" />
      <path d={RIVER} stroke={COLORS.water} strokeWidth="56" fill="none" strokeLinecap="round" />
      <ellipse cx="826" cy="690" rx="34" ry="12" fill={COLORS.water} />

      {/* 도로 */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {ROADS.map((d) => (
          <path key={`casing-${d}`} d={d} stroke={COLORS.roadCasing} strokeWidth="9" />
        ))}
        {ROADS.map((d) => (
          <path key={d} d={d} stroke={COLORS.road} strokeWidth="6" />
        ))}
        {HIGHWAYS.map((d) => (
          <path key={`casing-${d}`} d={d} stroke={COLORS.highwayCasing} strokeWidth="11" />
        ))}
        {HIGHWAYS.map((d) => (
          <path key={d} d={d} stroke={COLORS.highway} strokeWidth="7.5" />
        ))}
      </g>

      {/* 이름 */}
      <g fontFamily="inherit" textAnchor="middle">
        {DISTRICTS.map((district) => (
          <text
            key={district.name}
            x={district.x}
            y={district.y}
            fontSize="17"
            fontWeight="600"
            letterSpacing="1"
            fill={COLORS.district}
            stroke={COLORS.land}
            strokeWidth="4"
            paintOrder="stroke"
          >
            {district.name}
          </text>
        ))}
        <text x="372" y="652" fontSize="17" fontWeight="600" fill={COLORS.waterLabel} letterSpacing="6">
          한강
        </text>
        <g fontSize="13" fontWeight="500" fill={COLORS.landmark} stroke={COLORS.land} strokeWidth="3" paintOrder="stroke">
          <text x="440" y="112">
            북악산
          </text>
          <text x="466" y="208">
            경복궁
          </text>
          <text x="458" y="490">
            남산
          </text>
          <text x="724" y="590">
            서울숲
          </text>
          <text x="908" y="812">
            올림픽공원
          </text>
          <text x="104" y="552">
            하늘공원
          </text>
        </g>
      </g>
    </svg>
  );
}

// 지도를 끌거나 마커가 바뀌어도 그림은 다시 그릴 필요가 없다.
export const CityMapArt = memo(CityMapArtBase);
