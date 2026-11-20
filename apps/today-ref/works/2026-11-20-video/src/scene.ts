// 실제 영상 파일 대신 재생 시각(t초)에 따라 움직이는 장면을 캔버스에 그린다.
// 같은 영상, 같은 시각이면 언제나 같은 그림이 나오므로 썸네일과 재생 화면이 일치한다.
import type { Video } from "./data";

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, video: Video, t: number) {
  const { palette, scene } = video;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // 해나 달은 영상 전체 길이에 걸쳐 왼쪽에서 오른쪽으로 천천히 지나간다.
  const progress = t / video.durationSec;
  const sunX = width * (0.12 + progress * 0.76);
  const sunY = height * (0.42 - Math.sin(progress * Math.PI) * 0.22);
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, height * 0.32);
  glow.addColorStop(0, withAlpha(palette.sun, 0.55));
  glow.addColorStop(1, withAlpha(palette.sun, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, height * 0.07, 0, Math.PI * 2);
  ctx.fill();

  if (scene === "city") drawCity(ctx, width, height, video, t);
  else drawWaves(ctx, width, height, video, t);
}

// hills는 느린 언덕, sea는 빠르게 흔들리는 물결이다. 앞 층일수록 빨리 움직여 원근이 생긴다.
function drawWaves(ctx: CanvasRenderingContext2D, width: number, height: number, video: Video, t: number) {
  const isSea = video.scene === "sea";
  video.palette.layers.forEach((color, layer) => {
    const base = height * (isSea ? 0.6 + layer * 0.12 : 0.55 + layer * 0.14);
    const amplitude = height * (isSea ? 0.018 + layer * 0.01 : 0.06 - layer * 0.012);
    const wavelength = width * (isSea ? 0.35 - layer * 0.06 : 0.9 - layer * 0.2);
    const speed = isSea ? 40 + layer * 35 : 6 + layer * 9;
    const offset = t * speed;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) {
      const y = base + Math.sin(((x + offset) / wavelength) * Math.PI * 2 + layer * 1.7) * amplitude;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
}

function drawCity(ctx: CanvasRenderingContext2D, width: number, height: number, video: Video, t: number) {
  const [far, , near] = video.palette.layers;
  [far, near].forEach((color, layer) => {
    const count = layer === 0 ? 14 : 9;
    const drift = (t * (layer === 0 ? 4 : 10)) % (width / count);
    for (let i = -1; i <= count; i += 1) {
      const seed = hash(`${video.id}-${layer}-${i}`);
      const buildingWidth = width / count;
      const x = i * buildingWidth - drift;
      const top = height * (layer === 0 ? 0.42 + seed * 0.18 : 0.55 + seed * 0.22);
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, top, buildingWidth - 4, height - top);
      if (layer === 1) drawWindows(ctx, x + 2, top, buildingWidth - 4, height - top, seed, t);
    }
  });
}

function drawWindows(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, t: number) {
  const size = Math.max(3, w / 7);
  for (let row = 0; row * size * 2 < h - size; row += 1) {
    for (let col = 0; col * size * 2 < w - size; col += 1) {
      // 창마다 정해진 주기로 불이 켜지고 꺼져 시간이 흐르는 것이 보인다.
      const phase = hash(`${seed}-${row}-${col}`);
      const lit = Math.sin(t * 0.4 + phase * 40) > 0.1;
      ctx.fillStyle = lit ? "rgba(255, 214, 140, 0.85)" : "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(x + size * 0.6 + col * size * 2, y + size + row * size * 2, size, size);
    }
  }
}

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return ((value >>> 0) % 1000) / 1000;
}

function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
