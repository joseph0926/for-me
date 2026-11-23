// 썸네일의 대표 색을 뽑고, 색 거르기에서 고른 견본과 가까운지 판단한다.
export const swatches = [
  "#d9463b", "#ef8a3c", "#f2c94c", "#7fb069", "#2f8f6f", "#4aa3c7",
  "#3d5a98", "#8b5cc4", "#d978a8", "#8a5a3c", "#f4f1ea", "#22252b",
] as const;

type Rgb = [number, number, number];

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function fromHex(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 사람 눈이 초록 차이에 민감한 정도를 반영한 가벼운 거리. 0~약 765.
function distance(a: Rgb, b: Rgb): number {
  const mean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db);
}

function toHsl([r, g, b]: Rgb): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rn ? ((gn - bn) / d + 6) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

const isNeutral = ({ s, l }: { s: number; l: number }) => s < 0.3 || l < 0.12 || l > 0.92;

// RGB 거리만 쓰면 사진마다 있는 회색과 어두운 그늘이 초록이나 검정 견본에 모두 걸렸다.
// 그래서 무채색 견본은 사진의 주된 색(앞의 3개) 중 밝기가 비슷한 무채색과, 유채색 견본은 색상과 밝기가 가까운 유채색과만 맞춘다.
export function isNear(paletteHex: string[], swatchHex: string): boolean {
  const target = toHsl(fromHex(swatchHex));
  const colors = paletteHex.map((hex) => toHsl(fromHex(hex)));
  if (isNeutral(target)) {
    return colors.slice(0, 3).some((color) => isNeutral(color) && Math.abs(color.l - target.l) < 0.15);
  }
  return colors.some((color) => {
    if (isNeutral(color)) return false;
    const hueGap = Math.min(Math.abs(color.h - target.h), 360 - Math.abs(color.h - target.h));
    return hueGap < 18 && Math.abs(color.l - target.l) < 0.25;
  });
}

// 48px로 줄인 이미지를 4비트씩 묶어 많이 나온 색부터 서로 충분히 다른 것만 6개까지 고른다.
export async function extractPalette(src: string): Promise<string[]> {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(image, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);

  const buckets = new Map<number, { count: number; sum: Rgb }>();
  for (let i = 0; i < data.length; i += 4) {
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
    bucket.count += 1;
    bucket.sum[0] += data[i];
    bucket.sum[1] += data[i + 1];
    bucket.sum[2] += data[i + 2];
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((bucket) => bucket.sum.map((v) => v / bucket.count) as Rgb);
  const picked: Rgb[] = [];
  for (const color of ranked) {
    if (picked.every((other) => distance(other, color) > 90)) picked.push(color);
    if (picked.length === 6) break;
  }
  return picked.map(toHex);
}
