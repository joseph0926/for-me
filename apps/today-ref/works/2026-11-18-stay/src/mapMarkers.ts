import { type MapPoint, type Stay, lowestPrice } from "./data";
import { wonCompact } from "./pricing";

// 지도 마커를 화면에서 겹치지 않게 묶는다. 위치는 지도 좌표(1000 x 1000), 겹침 판단은 화면 픽셀로 한다.

export interface MarkerGroup {
  key: string;
  stays: Stay[];
  pos: MapPoint;
  label: string;
}

const MARKER_HEIGHT_PX = 28;
const MARKER_GAP_PX = 2;

// 마커 글씨(13px, 숫자는 고정폭)와 좌우 여백으로 너비를 어림한다.
function markerWidthPx(label: string) {
  let text = 0;
  for (const char of label) {
    if (/[가-힣]/.test(char)) text += 12.5;
    else if (char === ".") text += 3.5;
    else text += 7;
  }
  return text + 22;
}

function labelFor(stays: Stay[]) {
  return stays.length === 1 ? wonCompact(lowestPrice(stays[0])) : `${stays.length}곳`;
}

function centroid(stays: Stay[]): MapPoint {
  const sum = stays.reduce((acc, stay) => ({ x: acc.x + stay.pos.x, y: acc.y + stay.pos.y }), { x: 0, y: 0 });
  return { x: sum.x / stays.length, y: sum.y / stays.length };
}

function makeGroup(stays: Stay[]): MarkerGroup {
  return {
    key: stays.map((stay) => stay.id).join("+"),
    stays,
    pos: centroid(stays),
    label: labelFor(stays),
  };
}

function overlaps(a: MarkerGroup, b: MarkerGroup, pxPerUnit: number) {
  const dx = Math.abs(a.pos.x - b.pos.x) * pxPerUnit;
  const dy = Math.abs(a.pos.y - b.pos.y) * pxPerUnit;
  const minDx = (markerWidthPx(a.label) + markerWidthPx(b.label)) / 2 + MARKER_GAP_PX;
  return dx < minDx && dy < MARKER_HEIGHT_PX + MARKER_GAP_PX;
}

/** 겹치는 마커 중 가장 가까운 두 개를 하나로 합치기를 더 겹치는 마커가 없을 때까지 되풀이한다. */
export function groupMarkers(stays: Stay[], pxPerUnit: number): MarkerGroup[] {
  let groups = stays.map((stay) => makeGroup([stay]));

  for (;;) {
    let closest: { i: number; j: number; distance: number } | null = null;
    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        if (!overlaps(groups[i], groups[j], pxPerUnit)) continue;
        const distance = Math.hypot(groups[i].pos.x - groups[j].pos.x, groups[i].pos.y - groups[j].pos.y);
        if (!closest || distance < closest.distance) closest = { i, j, distance };
      }
    }
    if (!closest) return groups;

    const merged = makeGroup([...groups[closest.i].stays, ...groups[closest.j].stays]);
    const { i, j } = closest;
    groups = [...groups.filter((_, index) => index !== i && index !== j), merged];
  }
}
