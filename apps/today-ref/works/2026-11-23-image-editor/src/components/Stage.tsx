// 가운데 작업 화면. 결과를 캔버스에 그리고, 도구에 따라 자르기 틀(r3), 표시 그리기, 원본 비교 막대(r2)를 겹친다.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

import { applyPoint, clampRect, cropOf, outputMatrix, toSource, turnedSize, type Size } from "../editor/geometry";
import { canvasSize, counterFor, insidePolygon, markOutline, moveMark, render } from "../editor/render";
import type { EditState, Mark, Rect } from "../editor/state";
import type { MarkStyle, Tool } from "../tools";
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
  // key가 같은 연속 변경은 되돌리기에서 한 번으로 합친다.
  onEdit: (next: EditState, key?: string) => void;
  onSeal: () => void;
  onScale: (scale: number, fitScale: number) => void;
}

const padding = 40;
type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";

export function Stage(props: StageProps) {
  const { image, source, edit, tool, zoom, compare, markStyle, lockedRatio, selectedMarkId, onSelectMark, onEdit, onSeal, onScale } = props;
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
  const selectionOutline = selected && !cropping ? outlineOf(selected, source, edit, scale, canvas.current?.getContext("2d") ?? undefined) : null;
  const textAt = textDraft ? applyPoint(outputMatrix(source, edit), textDraft.at).map((v) => v * scale) : null;
  const cursor =
    compare ? "ew-resize" : tool === "pen" || tool === "shape" ? "crosshair" : tool === "text" ? "text" : tool === "select" ? "default" : "default";

  return (
    <div ref={area} className="relative min-h-0 flex-1 overflow-auto bg-[var(--canvas)] thin-scroll">
      <div className="flex min-h-full min-w-full flex-col items-center justify-center p-10" style={{ width: Math.max(box.width, canvasPx.width + padding * 2) }}>
        <div
          className="relative shrink-0 shadow-[0_2px_16px_rgb(0_0_0/0.25)]"
          style={{ width: canvasPx.width, height: canvasPx.height, cursor }}
          onPointerDown={onPointerDown}
          onPointerMove={(event) => {
            onPointerMove(event);
            onCropMove(event);
          }}
          onPointerUp={() => {
            if (drag.current?.kind === "crop") onSeal();
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
              onHandle={startCropDrag}
            />
          )}

          {selectionOutline && (
            <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
              <polygon points={selectionOutline} fill="none" stroke="white" strokeWidth={1.5} strokeDasharray="5 4" />
              <polygon points={selectionOutline} fill="none" stroke="black" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="5 4" strokeDashoffset={4.5} />
            </svg>
          )}

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
            onChange={(straighten) => onEdit({ ...edit, straighten, crop: edit.crop ? clampRect(edit.crop, board) : null }, "straighten")}
            onCommit={onSeal}
            size={`${Math.round(crop.w)} x ${Math.round(crop.h)}`}
          />
        )}
      </div>
    </div>
  );
}

// 고른 표시의 테두리를 화면 좌표 다각형으로. 돌린 이미지에서는 기울어진 사각형이 된다.
function outlineOf(mark: Mark, source: Size, edit: EditState, scale: number, ctx?: CanvasRenderingContext2D): string {
  const matrix = new DOMMatrix().scale(scale).multiply(outputMatrix(source, edit));
  return markOutline(mark, ctx)
    .map((p) => applyPoint(matrix, p).join(","))
    .join(" ");
}

function CropFrame({ rect, scale, onHandle }: { rect: Rect; scale: number; onHandle: (handle: Handle) => (event: ReactPointerEvent) => void }) {
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
  return (
    <>
      {/* 틀 밖은 어둡게 덮는다. 틀 자체에 큰 그림자를 둘러 한 번에 그린다. */}
      <div
        className="absolute cursor-move"
        style={{ left, top, width, height, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)", outline: "1px solid rgb(255 255 255 / 0.9)" }}
        onPointerDown={onHandle("move")}
        role="group"
        aria-label="자르기 범위"
      >
        {[1, 2].map((i) => (
          <span key={`v${i}`} className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/45" style={{ left: `${(i * 100) / 3}%` }} />
        ))}
        {[1, 2].map((i) => (
          <span key={`h${i}`} className="pointer-events-none absolute right-0 left-0 h-px bg-white/45" style={{ top: `${(i * 100) / 3}%` }} />
        ))}
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

