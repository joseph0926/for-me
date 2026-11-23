// 편집 내용을 캔버스에 그린다. 화면 미리보기와 저장이 같은 함수를 써서 결과가 어긋나지 않는다.
import { boardMatrix, cropOf, outputMatrix, turnedSize, type Size } from "./geometry";
import { effectiveLook, type Counter, type EditState, type Mark } from "./state";

export interface RenderOptions {
  // 결과 1px를 캔버스 몇 px로 그릴지.
  scale: number;
  // 자르기 도구를 쓰는 동안처럼 자르기 전 판 전체를 그린다.
  wholeBoard?: boolean;
  // 비교할 때 조정과 필터를 빼고 그린다.
  plain?: boolean;
  // 글을 고치는 중인 표시는 입력칸이 대신 보여 주므로 그리지 않는다.
  hideMarkId?: string | null;
}

export function canvasSize(source: Size, edit: EditState, options: RenderOptions): Size {
  const crop = cropOf(source, edit);
  const { width, height } = options.wholeBoard ? turnedSize(source, edit) : { width: crop.w, height: crop.h };
  return { width: Math.max(1, Math.round(width * options.scale)), height: Math.max(1, Math.round(height * options.scale)) };
}

export function render(canvas: HTMLCanvasElement, image: CanvasImageSource, source: Size, edit: EditState, options: RenderOptions) {
  const size = canvasSize(source, edit, options);
  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const matrix = new DOMMatrix().scale(options.scale).multiply(options.wholeBoard ? boardMatrix(source, edit) : outputMatrix(source, edit));
  const look = effectiveLook(edit);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.filter = options.plain ? "none" : cssFilter(look);
  ctx.setTransform(matrix);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, source.width, source.height);
  ctx.filter = "none";

  if (!options.plain) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paintTone(ctx, size, look.adjust);
  }

  ctx.setTransform(matrix);
  for (const mark of edit.marks) {
    if (mark.id !== options.hideMarkId) drawMark(ctx, mark);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// 브라우저 캔버스 필터로 바꿀 수 있는 조정. 값의 범위는 화면에서 너무 세지 않게 정한 것이다.
function cssFilter(look: ReturnType<typeof effectiveLook>): string {
  const { adjust } = look;
  const brightness = 1 + adjust.exposure / 160 + adjust.highlights / 400;
  const contrast = 1 + adjust.contrast / 140 - adjust.highlights / 500;
  const saturate = Math.max(0, 1 + adjust.saturation / 100);
  const hue = adjust.tint * 0.3;
  return [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturate.toFixed(3)})`,
    `hue-rotate(${hue.toFixed(1)}deg)`,
    look.grayscale > 0 ? `grayscale(${(look.grayscale / 100).toFixed(2)})` : "",
    look.sepia > 0 ? `sepia(${(look.sepia / 100).toFixed(2)})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// 색온도는 주황과 파랑을 부드럽게 겹쳐, 바랜 느낌은 검정을 들어 올려, 비네트는 가장자리를 어둡게 해서 만든다.
function paintTone(ctx: CanvasRenderingContext2D, size: Size, adjust: ReturnType<typeof effectiveLook>["adjust"]) {
  const { width, height } = size;
  if (adjust.warmth !== 0) {
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = adjust.warmth > 0 ? `rgba(255, 150, 60, ${(adjust.warmth / 100) * 0.55})` : `rgba(60, 130, 255, ${(-adjust.warmth / 100) * 0.55})`;
    ctx.fillRect(0, 0, width, height);
  }
  if (adjust.fade > 0) {
    ctx.globalCompositeOperation = "lighten";
    ctx.fillStyle = `rgba(70, 66, 62, ${(adjust.fade / 100) * 0.9})`;
    ctx.fillRect(0, 0, width, height);
  }
  if (adjust.vignette > 0) {
    ctx.globalCompositeOperation = "multiply";
    const radius = Math.hypot(width, height) / 2;
    const gradient = ctx.createRadialGradient(width / 2, height / 2, radius * 0.45, width / 2, height / 2, radius);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${(adjust.vignette / 100) * 0.75})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalCompositeOperation = "source-over";
}

export function drawMark(ctx: CanvasRenderingContext2D, mark: Mark) {
  ctx.save();
  ctx.strokeStyle = mark.color;
  ctx.fillStyle = mark.color;
  ctx.lineWidth = mark.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (mark.kind) {
    case "pen": {
      ctx.beginPath();
      const [first, ...rest] = mark.points;
      ctx.moveTo(first[0], first[1]);
      // 점 하나만 찍었으면 둥근 점으로 보이게 같은 자리로 선을 긋는다.
      if (rest.length === 0) ctx.lineTo(first[0] + 0.01, first[1]);
      for (const [x, y] of rest) ctx.lineTo(x, y);
      ctx.stroke();
      break;
    }
    case "rect": {
      ctx.beginPath();
      mark.corners.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "arrow": {
      const [x1, y1] = mark.from;
      const [x2, y2] = mark.to;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = Math.max(mark.width * 4, 12);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.moveTo(x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45));
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45));
      ctx.stroke();
      break;
    }
    case "text": {
      ctx.font = `650 ${mark.size}px "Pretendard Variable", Pretendard, sans-serif`;
      ctx.textBaseline = "top";
      ctx.translate(mark.at[0], mark.at[1]);
      ctx.transform(...counterMatrix(mark.counter));
      mark.text.split("\n").forEach((line, index) => ctx.fillText(line, 0, index * mark.size * 1.3));
      break;
    }
  }
  ctx.restore();
}

// 표시를 감싸는 네 꼭짓점(원본 좌표). 고르기 판정과 선택 테두리에 쓴다. 글은 상쇄 회전 때문에 기울어진 사각형이 된다.
export function markOutline(mark: Mark, ctx?: CanvasRenderingContext2D): [number, number][] {
  const pad = mark.width / 2 + 6;
  const box = (xs: number[], ys: number[]): [number, number][] => {
    const [x1, x2, y1, y2] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
    return [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ];
  };
  if (mark.kind === "pen") return box(mark.points.map((p) => p[0]), mark.points.map((p) => p[1]));
  if (mark.kind === "rect") return mark.corners;
  if (mark.kind === "arrow") return box([mark.from[0], mark.to[0]], [mark.from[1], mark.to[1]]);
  const lines = mark.text.split("\n");
  let width = Math.max(...lines.map((line) => line.length)) * mark.size * 0.6;
  if (ctx) {
    ctx.save();
    ctx.font = `650 ${mark.size}px "Pretendard Variable", Pretendard, sans-serif`;
    width = Math.max(...lines.map((line) => ctx.measureText(line).width));
    ctx.restore();
  }
  const height = lines.length * mark.size * 1.3;
  const local = new DOMMatrix().translate(mark.at[0], mark.at[1]).multiply(new DOMMatrix(counterMatrix(mark.counter)));
  const corners: [number, number][] = [
    [-6, -6],
    [width + 6, -6],
    [width + 6, height + 6],
    [-6, height + 6],
  ];
  return corners.map(([x, y]) => {
    const p = local.transformPoint(new DOMPoint(x, y));
    return [p.x, p.y];
  });
}

// 점이 다각형 안에 있는지(반직선 교차 판정).
export function insidePolygon([x, y]: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function counterMatrix(counter: Counter): [number, number, number, number, number, number] {
  const m = new DOMMatrix().scale(counter.flipX ? -1 : 1, counter.flipY ? -1 : 1).rotate(counter.degrees);
  return [m.a, m.b, m.c, m.d, m.e, m.f];
}

// 지금 이미지의 회전과 뒤집기를 상쇄하는 값. 원본에서 결과로 갈 때 수평 회전, 키우기, 90도 회전, 뒤집기 순으로 바뀌므로 그 역순으로 되돌린다.
export function counterFor(edit: EditState): Counter {
  return { degrees: -(edit.rotation + edit.straighten), flipX: edit.flipH, flipY: edit.flipV };
}

export function moveMark(mark: Mark, dx: number, dy: number): Mark {
  switch (mark.kind) {
    case "pen":
      return { ...mark, points: mark.points.map(([x, y]) => [x + dx, y + dy]) };
    case "text":
      return { ...mark, at: [mark.at[0] + dx, mark.at[1] + dy] };
    case "rect":
      return { ...mark, corners: mark.corners.map(([x, y]): [number, number] => [x + dx, y + dy]) };
    default:
      return { ...mark, from: [mark.from[0] + dx, mark.from[1] + dy], to: [mark.to[0] + dx, mark.to[1] + dy] };
  }
}
