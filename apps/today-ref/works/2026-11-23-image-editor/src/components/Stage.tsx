// 가운데 작업 화면. 결과를 캔버스에 그리고, 도구에 따라 자르기 틀(r3), 표시 그리기, 원본 비교 막대(r2)를 겹친다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

import { applyPoint, clampRect, cropOf, outputMatrix, toSource, turnedSize, type Size } from "../editor/geometry";
import { canvasSize, counterFor, insidePolygon, markOutline, moveMark, render } from "../editor/render";
import type { EditState, Mark, Rect } from "../editor/state";
import type { MarkStyle, Tool } from "../tools";
import { TrashIcon } from "./Icons";
import { Range, Swatches } from "./OptionBar";
import { StraightenDial } from "./StraightenDial";

export type Zoom = "fit" | number;

interface StageProps {
  image: HTMLImageElement;
  source: Size;
  edit: EditState;
  tool: Tool;
  zoom: Zoom;
  compare: boolean;
  markStyle: MarkStyle;
  // 자르기 비율(가로/세로). null이면 자유.
  lockedRatio: number | null;
  selectedMarkId: string | null;
  onSelectMark: (id: string | null) => void;
  onMarkChange: (patch: Partial<{ color: string; width: number; size: number }>, key?: string) => void;
  onMarkDelete: () => void;
  // key가 같은 연속 변경은 되돌리기에서 한 번으로 합친다.
  onEdit: (next: EditState, key?: string) => void;
  onSeal: () => void;
  onScale: (scale: number, fitScale: number) => void;
}

const padding = 40;
// 수평을 돌리거나 틀을 끈 뒤 3x3 안내선을 더 보여 주는 시간(tastepin 자르기와 수평 값).
const guideLingerMs = 700;
type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";

export function Stage(props: StageProps) {
  const { image, source, edit, tool, zoom, compare, markStyle, lockedRatio, selectedMarkId, onSelectMark, onMarkChange, onMarkDelete, onEdit, onSeal, onScale } = props;
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const plainCanvas = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const [split, setSplit] = useState(0.5);
  // 그리는 중인 표시. 손을 뗄 때 한 번에 기록한다.
  const [draft, setDraft] = useState<Mark | null>(null);
  // 사각형은 화면에서 끈 시작점(결과 좌표)을 기억해 반듯한 네 꼭짓점을 만든다.
  const rectStart = useRef<[number, number] | null>(null);
  const [textDraft, setTextDraft] = useState<{ id: string | null; at: [number, number]; text: string } | null>(null);
  // 3x3 안내선은 돌리거나 끄는 동안과 그 뒤 잠깐만 보인다.
  const [guides, setGuides] = useState(false);
  const guideTimer = useRef<number | undefined>(undefined);
  const holdGuides = () => {
    window.clearTimeout(guideTimer.current);
    setGuides(true);
  };
  const releaseGuides = () => {
    window.clearTimeout(guideTimer.current);
    guideTimer.current = window.setTimeout(() => setGuides(false), guideLingerMs);
  };
  useEffect(() => () => window.clearTimeout(guideTimer.current), []);
  const drag = useRef<{ kind: "crop"; handle: Handle; start: [number, number]; rect: Rect } | { kind: "move"; id: string; last: [number, number] } | { kind: "split" } | null>(null);

  const cropping = tool === "crop";
  const board = turnedSize(source, edit);
  const crop = cropOf(source, edit);
  const shown = cropping ? board : { width: crop.w, height: crop.h };
  const dialSpace = cropping ? 96 : 0;
  const fitScale = box.width > 0 ? Math.min(1, (box.width - padding * 2) / shown.width, (box.height - padding * 2 - dialSpace) / shown.height) : 0;
  const scale = zoom === "fit" ? fitScale : zoom;

  useLayoutEffect(() => {
    const element = area.current;
    if (!element) return;
    setBox({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => onScale(scale, fitScale), [scale, fitScale, onScale]);

  const withDraft: EditState = draft ? { ...edit, marks: [...edit.marks, draft] } : edit;

  useEffect(() => {
    if (!canvas.current || scale <= 0) return;
    render(canvas.current, image, source, withDraft, { scale, wholeBoard: cropping, hideMarkId: textDraft?.id ?? null });
    if (compare && plainCanvas.current && !cropping) {
      render(plainCanvas.current, image, source, { ...withDraft, marks: [] }, { scale, plain: true });
    }
  });

  // 화면 좌표를 결과(또는 자르기 중이면 판) 좌표로.
  const toOutput = (event: { clientX: number; clientY: number }): [number, number] => {
    const rect = canvas.current!.getBoundingClientRect();
    return [(event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale];
  };
  const toSourcePoint = (event: { clientX: number; clientY: number }) => toSource(source, edit, toOutput(event));

  const hitMark = (point: [number, number]): Mark | undefined => {
    const ctx = canvas.current?.getContext("2d") ?? undefined;
    return [...edit.marks].reverse().find((mark) => insidePolygon(point, markOutline(mark, ctx)));
  };

  const commitText = () => {
    if (!textDraft) return;
    const text = textDraft.text.trim();
    const existing = textDraft.id ? edit.marks.find((mark) => mark.id === textDraft.id) : undefined;
    if (existing) {
      const marks = text ? edit.marks.map((mark) => (mark.id === existing.id && mark.kind === "text" ? { ...mark, text } : mark)) : edit.marks.filter((mark) => mark.id !== existing.id);
      onEdit({ ...edit, marks });
    } else if (text) {
      const id = crypto.randomUUID();
      onEdit({ ...edit, marks: [...edit.marks, { id, kind: "text", at: textDraft.at, text, color: markStyle.color, width: 1, size: markStyle.textSize, counter: counterFor(edit) }] });
      onSelectMark(id);
    }
    setTextDraft(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || compare) return;
    if (textDraft) {
      commitText();
      return;
    }
    const target = event.currentTarget;
    if (cropping) return;
    const point = toSourcePoint(event);
    if (tool === "pen" || tool === "shape") {
      target.setPointerCapture(event.pointerId);
      const id = crypto.randomUUID();
      const base = { id, color: markStyle.color, width: markStyle.width };
      if (tool === "pen") setDraft({ ...base, kind: "pen", points: [point] });
      else if (markStyle.shape === "arrow") setDraft({ ...base, kind: "arrow", from: point, to: point });
      else {
        rectStart.current = toOutput(event);
        setDraft({ ...base, kind: "rect", corners: [point, point, point, point] });
      }
      return;
    }
    if (tool === "text") {
      // 누른 뒤 브라우저가 초점을 본문으로 옮기면 막 연 입력칸이 바로 닫히므로 기본 동작을 막는다.
      event.preventDefault();
      setTextDraft({ id: null, at: point, text: "" });
      return;
    }
    if (tool === "select") {
      const hit = hitMark(point);
      onSelectMark(hit?.id ?? null);
      if (hit) {
        target.setPointerCapture(event.pointerId);
        drag.current = { kind: "move", id: hit.id, last: point };
      }
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) {
      const point = toSourcePoint(event);
      if (draft.kind === "pen") setDraft({ ...draft, points: [...draft.points, point] });
      else if (draft.kind === "arrow") setDraft({ ...draft, to: point });
      else if (draft.kind === "rect" && rectStart.current) {
        const [x1, y1] = rectStart.current;
        const [x2, y2] = toOutput(event);
        const corners = ([[x1, y1], [x2, y1], [x2, y2], [x1, y2]] as [number, number][]).map((p) => toSource(source, edit, p));
        setDraft({ ...draft, corners });
      }
      return;
    }
    const current = drag.current;
    if (current?.kind === "move") {
      const point = toSourcePoint(event);
      const [dx, dy] = [point[0] - current.last[0], point[1] - current.last[1]];
      current.last = point;
      onEdit({ ...edit, marks: edit.marks.map((mark) => (mark.id === current.id ? moveMark(mark, dx, dy) : mark)) }, `move-${current.id}`);
    }
  };

  const onPointerUp = () => {
    if (draft) {
      // 거의 움직이지 않은 도형은 실수로 누른 것으로 보고 버린다. 펜은 점 하나도 남긴다.
      const span = (a: [number, number], b: [number, number]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
      const tiny =
        (draft.kind === "arrow" && span(draft.from, draft.to) < 4) || (draft.kind === "rect" && span(draft.corners[0], draft.corners[2]) < 4);
      rectStart.current = null;
      if (!tiny) onEdit({ ...edit, marks: [...edit.marks, draft] });
      setDraft(null);
    }
    if (drag.current?.kind === "move") onSeal();
    drag.current = null;
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== "select" && tool !== "text") return;
    const hit = hitMark(toSourcePoint(event));
    if (hit?.kind === "text") {
      event.preventDefault();
      setTextDraft({ id: hit.id, at: hit.at, text: hit.text });
    }
  };

  // 자르기 틀 끌기. 판 좌표로 계산하고 판 밖으로 나가지 않게 묶는다.
  const startCropDrag = (handle: Handle) => (event: ReactPointerEvent) => {
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { kind: "crop", handle, start: toOutput(event), rect: crop };
    holdGuides();
  };
  const onCropMove = (event: ReactPointerEvent) => {
    const current = drag.current;
    if (current?.kind !== "crop") return;
    const [x, y] = toOutput(event);
    const dx = x - current.start[0];
    const dy = y - current.start[1];
    const r = current.rect;
    let next: Rect = { ...r };
    if (current.handle === "move") next = { ...r, x: r.x + dx, y: r.y + dy };
    else {
      if (current.handle.includes("w")) next = { ...next, x: r.x + dx, w: r.w - dx };
      if (current.handle.includes("e")) next = { ...next, w: r.w + dx };
      if (current.handle.includes("n")) next = { ...next, y: r.y + dy, h: r.h - dy };
      if (current.handle.includes("s")) next = { ...next, h: r.h + dy };
      if (lockedRatio) {
        // 비율을 고정했으면 가로 변화 기준으로 세로를 맞춘다. 위아래 손잡이만 끌 때는 세로 기준.
        if (current.handle === "n" || current.handle === "s") next.w = next.h * lockedRatio;
        else next.h = next.w / lockedRatio;
        if (current.handle.includes("n")) next.y = r.y + r.h - next.h;
        if (current.handle.includes("w")) next.x = r.x + r.w - next.w;
      }
    }
    if (next.w < 24 || next.h < 24) return;
    const clamped = clampRect(next, board);
    if (lockedRatio && Math.abs(clamped.w / clamped.h - lockedRatio) > 0.01 && current.handle !== "move") return;
    onEdit({ ...edit, crop: clamped }, "crop-drag");
  };


  const canvasPx = canvasSize(source, edit, { scale, wholeBoard: cropping });
  const selected = edit.marks.find((mark) => mark.id === selectedMarkId);
  const selectionOutline = selected && !cropping && tool === "select" ? outlineOf(selected, source, edit, scale, canvas.current?.getContext("2d") ?? undefined) : null;
  const textAt = textDraft ? applyPoint(outputMatrix(source, edit), textDraft.at).map((v) => v * scale) : null;
  const cursor =
    compare ? "ew-resize" : tool === "pen" || tool === "shape" ? "crosshair" : tool === "text" ? "text" : tool === "select" ? "default" : "default";

  return (
    <div
      ref={area}
      className="relative min-h-0 flex-1 overflow-auto bg-[var(--canvas)] thin-scroll"
      // 사진 바깥 어두운 자리를 누르면 고른 표시를 놓는다.
      onPointerDown={(event) => {
        if (tool === "select" && !(event.target as Element).closest("[data-board]")) onSelectMark(null);
      }}
    >
      <div className="flex min-h-full min-w-full flex-col items-center justify-center p-10" style={{ width: Math.max(box.width, canvasPx.width + padding * 2) }}>
        <div
          data-board
          className="relative shrink-0 shadow-[0_2px_16px_rgb(0_0_0/0.25)]"
          style={{ width: canvasPx.width, height: canvasPx.height, cursor }}
          onPointerDown={onPointerDown}
          onPointerMove={(event) => {
            onPointerMove(event);
            onCropMove(event);
          }}
          onPointerUp={() => {
            if (drag.current?.kind === "crop") {
              onSeal();
              releaseGuides();
            }
            onPointerUp();
          }}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          <canvas ref={canvas} className="block size-full" aria-label="편집 중인 이미지" />

          {compare && !cropping && (
            <>
              <canvas
                ref={plainCanvas}
                className="absolute inset-0 block size-full"
                style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}
                aria-hidden="true"
              />
              <span className="absolute top-3 left-3 rounded-[4px] bg-black/60 px-2 py-1 text-[12px] font-[650] text-white">원본</span>
              <span className="absolute top-3 right-3 rounded-[4px] bg-black/60 px-2 py-1 text-[12px] font-[650] text-white">편집</span>
              <div
                role="slider"
                tabIndex={0}
                aria-label="원본과 편집 나누기"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(split * 100)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") setSplit((v) => Math.max(0, v - 0.05));
                  if (event.key === "ArrowRight") setSplit((v) => Math.min(1, v + 0.05));
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = { kind: "split" };
                }}
                onPointerMove={(event) => {
                  if (drag.current?.kind !== "split") return;
                  const rect = canvas.current!.getBoundingClientRect();
                  setSplit(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
                }}
                onPointerUp={() => (drag.current = null)}
                className="absolute top-0 bottom-0 w-8 -translate-x-1/2 cursor-ew-resize"
                style={{ left: `${split * 100}%` }}
              >
                <span className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_4px_rgb(0_0_0/0.4)]" />
                <span className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/30 backdrop-blur" />
              </div>
            </>
          )}

          {cropping && (
            <CropFrame
              rect={crop}
              scale={scale}
              canvas={canvasPx}
              guides={guides}
              onHandle={startCropDrag}
            />
          )}

          {selectionOutline && (
            // 고른 표시는 둘레 4px 밖의 1px 파란 테두리로 보인다(tastepin 표시 고르고 고치기).
            <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
              <polygon points={selectionOutline.map((p) => p.join(",")).join(" ")} fill="none" stroke="#2f7cf6" strokeWidth={1} />
            </svg>
          )}

          <AnimatePresence>
            {selected && selectionOutline && !textDraft && !draft && (
              <MarkBar
                key={selected.id}
                mark={selected}
                outline={selectionOutline}
                canvasWidth={canvasPx.width}
                onChange={onMarkChange}
                onCommit={onSeal}
                onDelete={onMarkDelete}
              />
            )}
          </AnimatePresence>

          {textDraft && textAt && (
            <textarea
              autoFocus
              aria-label="넣을 글"
              value={textDraft.text}
              placeholder="글 입력"
              onChange={(event) => setTextDraft({ ...textDraft, text: event.target.value })}
              onPointerDown={(event) => event.stopPropagation()}
              onBlur={commitText}
              onKeyDown={(event) => {
                if (event.key === "Escape") setTextDraft(null);
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  commitText();
                }
              }}
              rows={Math.max(1, textDraft.text.split("\n").length)}
              className="absolute resize-none overflow-hidden border border-dashed border-white/80 bg-black/10 p-0 leading-[1.3] font-[650] outline-none placeholder:text-white/60"
              style={{
                left: textAt[0],
                top: textAt[1],
                color: (selected?.kind === "text" && selected.id === textDraft.id ? selected.color : markStyle.color),
                fontSize: (textDraft.id ? ((edit.marks.find((m) => m.id === textDraft.id) as Extract<Mark, { kind: "text" }> | undefined)?.size ?? markStyle.textSize) : markStyle.textSize) * scale,
                minWidth: 120,
                width: `${Math.max(6, Math.max(...textDraft.text.split("\n").map((line) => line.length))) * 0.7}em`,
              }}
            />
          )}
        </div>

        {cropping && (
          <StraightenDial
            value={edit.straighten}
            onChange={(straighten) => {
              holdGuides();
              onEdit({ ...edit, straighten, crop: edit.crop ? clampRect(edit.crop, board) : null }, "straighten");
            }}
            onCommit={() => {
              onSeal();
              releaseGuides();
            }}
            size={`${Math.round(crop.w)} x ${Math.round(crop.h)}`}
          />
        )}
      </div>
    </div>
  );
}

// 고른 표시의 테두리를 화면 좌표 다각형으로. 돌린 이미지에서는 기울어진 사각형이 된다.
// 다각형은 늘 사각형이라 꼭짓점마다 두 변을 따라 바깥으로 밀면 테두리가 표시에서 일정하게 떨어진다.
function outlineOf(mark: Mark, source: Size, edit: EditState, scale: number, ctx?: CanvasRenderingContext2D): [number, number][] {
  const matrix = new DOMMatrix().scale(scale).multiply(outputMatrix(source, edit));
  const points = markOutline(mark, ctx).map((p) => applyPoint(matrix, p));
  // 사각형 표시의 다각형은 선 한가운데를 지나므로 선 굵기의 절반을 더 띄운다.
  const gap = 4 + (mark.kind === "rect" ? (mark.width * scale) / 2 : 0);
  const unit = ([x, y]: [number, number]): [number, number] => {
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };
  return points.map((point, i) => {
    const prev = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const a = unit([point[0] - prev[0], point[1] - prev[1]]);
    const b = unit([point[0] - next[0], point[1] - next[1]]);
    return [point[0] + (a[0] + b[0]) * gap, point[1] + (a[1] + b[1]) * gap];
  });
}

// 고른 표시 위 8px에 뜨는 작은 막대(tastepin 표시 고르고 고치기): 색 견본, 굵기나 크기, 지우기.
// 표시를 끌어 옮기면 따라가고, 위에 자리가 없으면 표시 아래로 내려간다. 등장은 흐림이 걷히며 커진다(모션 기본값).
function MarkBar({
  mark,
  outline,
  canvasWidth,
  onChange,
  onCommit,
  onDelete,
}: {
  mark: Mark;
  outline: [number, number][];
  canvasWidth: number;
  onChange: (patch: Partial<{ color: string; width: number; size: number }>, key?: string) => void;
  onCommit: () => void;
  onDelete: () => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [barSize, setBarSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (bar.current) setBarSize({ width: bar.current.offsetWidth, height: bar.current.offsetHeight });
  }, []);
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const center = (Math.min(...xs) + Math.max(...xs)) / 2;
  const above = Math.min(...ys) - 8 - barSize.height;
  // 작업 화면의 여백(padding) 안에서만 움직여 가로 스크롤이 생기지 않게 한다.
  const top = above >= -padding + 4 ? above : Math.max(...ys) + 8;
  const left = Math.max(-padding + 8, Math.min(canvasWidth + padding - 8 - barSize.width, center - barSize.width / 2));
  const isText = mark.kind === "text";
  return (
    <motion.div
      ref={bar}
      role="toolbar"
      aria-label="고른 표시"
      initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className="absolute z-20 flex items-center gap-2 rounded-md bg-[var(--raised)] py-1.5 pr-1.5 pl-2.5 whitespace-nowrap text-[var(--ink)] shadow-[var(--shadow)]"
      style={{ left, top, visibility: barSize.width ? "visible" : "hidden" }}
    >
      <Swatches small value={mark.color} onChange={(color) => onChange({ color })} />
      <Range
        compact
        label={isText ? "크기" : "굵기"}
        value={isText ? mark.size : mark.width}
        min={isText ? 12 : 2}
        max={isText ? 200 : 60}
        unit="px"
        onChange={(value) => onChange(isText ? { size: value } : { width: value }, `mark-size-${mark.id}`)}
        onCommit={onCommit}
      />
      <button
        type="button"
        aria-label="표시 지우기"
        title="지우기 (Delete)"
        onClick={onDelete}
        className="grid size-8 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
      >
        <TrashIcon size={16} />
      </button>
    </motion.div>
  );
}

function CropFrame({ rect, scale, canvas, guides, onHandle }: { rect: Rect; scale: number; canvas: Size; guides: boolean; onHandle: (handle: Handle) => (event: ReactPointerEvent) => void }) {
  const left = rect.x * scale;
  const top = rect.y * scale;
  const width = rect.w * scale;
  const height = rect.h * scale;
  const handles: { handle: Handle; style: CSSProperties; cursor: string; corner: boolean }[] = [
    { handle: "nw", style: { left: -6, top: -6 }, cursor: "nwse-resize", corner: true },
    { handle: "ne", style: { right: -6, top: -6 }, cursor: "nesw-resize", corner: true },
    { handle: "sw", style: { left: -6, bottom: -6 }, cursor: "nesw-resize", corner: true },
    { handle: "se", style: { right: -6, bottom: -6 }, cursor: "nwse-resize", corner: true },
    { handle: "n", style: { left: "50%", top: -6, marginLeft: -12 }, cursor: "ns-resize", corner: false },
    { handle: "s", style: { left: "50%", bottom: -6, marginLeft: -12 }, cursor: "ns-resize", corner: false },
    { handle: "w", style: { top: "50%", left: -6, marginTop: -12 }, cursor: "ew-resize", corner: false },
    { handle: "e", style: { top: "50%", right: -6, marginTop: -12 }, cursor: "ew-resize", corner: false },
  ];
  // 틀 밖은 6px 흐리고 검정 40%로 덮어 틀 안만 또렷하게 보인다(tastepin 자르기와 수평 값). 위, 아래, 왼쪽, 오른쪽 네 조각으로 덮는다.
  const shades: CSSProperties[] = [
    { left: 0, top: 0, width: canvas.width, height: top },
    { left: 0, top: top + height, width: canvas.width, height: Math.max(0, canvas.height - top - height) },
    { left: 0, top, width: left, height },
    { left: left + width, top, width: Math.max(0, canvas.width - left - width), height },
  ];
  return (
    <>
      {shades.map((style, i) => (
        <div key={i} aria-hidden="true" className="pointer-events-none absolute bg-black/40 backdrop-blur-[6px]" style={style} />
      ))}
      <div
        className="absolute cursor-move"
        style={{ left, top, width, height, outline: "1px solid rgb(255 255 255 / 0.9)" }}
        onPointerDown={onHandle("move")}
        role="group"
        aria-label="자르기 범위"
      >
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${guides ? "opacity-100" : "opacity-0"}`}>
          {[1, 2].map((i) => (
            <span key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-white/45" style={{ left: `${(i * 100) / 3}%` }} />
          ))}
          {[1, 2].map((i) => (
            <span key={`h${i}`} className="absolute right-0 left-0 h-px bg-white/45" style={{ top: `${(i * 100) / 3}%` }} />
          ))}
        </div>
        {handles.map(({ handle, style, cursor, corner }) => (
          <span
            key={handle}
            role="button"
            aria-label={`자르기 손잡이 ${handle}`}
            onPointerDown={onHandle(handle)}
            className="absolute grid place-items-center"
            style={{ ...style, cursor, width: corner ? 18 : 24, height: corner ? 18 : 24 }}
          >
            <span className={`block bg-white shadow-[0_0_3px_rgb(0_0_0/0.5)] ${corner ? "size-3 rounded-[2px]" : handle === "n" || handle === "s" ? "h-1 w-6 rounded-full" : "h-6 w-1 rounded-full"}`} />
          </span>
        ))}
      </div>
    </>
  );
}
