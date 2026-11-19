import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "motion/react";
import { useEffect, useState, type PointerEvent } from "react";

import { cancelSelection, listWindows, startRecording, type ScreenRect, type Target, type WindowTarget } from "./commands";

/** 오버레이 창 안의 CSS 픽셀 좌표 */
type Box = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

/**
 * 오버레이 창의 화면 위치(물리 픽셀)와 배율. Rust가 정한 위치가 아니라 실제 창 위치를 쓴다.
 * macOS는 화면 전체에 놓은 창을 메뉴 막대 아래로 옮겨 놓는다(QA-003).
 */
type OverlayFrame = { left: number; top: number; scale: number };

/** 누른 뒤 이만큼 움직여야 클릭이 아니라 드래그로 본다 */
const DRAG_THRESHOLD = 4;

type Gesture = { kind: "idle" } | { kind: "pressing"; start: Point } | { kind: "dragging"; start: Point; current: Point };

export function Overlay({ id }: { id: number }) {
  const [frame, setFrame] = useState<OverlayFrame | null>(null);
  const [targets, setTargets] = useState<WindowTarget[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [gesture, setGesture] = useState<Gesture>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fail = (reason: unknown) => active && setError(String(reason));
    // 창이 처음 그려진 뒤에 자리를 잡거나 운영체제가 옮길 수 있어, 옮겨질 때마다 다시 읽는다.
    const refreshFrame = () => {
      readOverlayFrame()
        .then((next) => active && setFrame(next))
        .catch(fail);
    };
    refreshFrame();
    const unlisten = getCurrentWindow().onMoved(refreshFrame);
    listWindows()
      .then((next) => active && setTargets(next))
      .catch(fail);
    return () => {
      active = false;
      void unlisten.then((stop) => stop());
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") void cancelSelection(id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [id]);

  const windows = frame ? targets.map((target) => ({ id: target.id, box: toLocal(target.bounds, frame) })) : [];
  const hovered = gesture.kind === "dragging" || !cursor ? undefined : windows.find((w) => contains(w.box, cursor));
  const hole = gesture.kind === "dragging" ? boxBetween(gesture.start, gesture.current) : hovered?.box;

  const begin = (target: Target) => {
    setError(null);
    startRecording(id, target).catch((reason) => setError(String(reason)));
  };

  const onPointerDown = (event: PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ kind: "pressing", start: pointOf(event) });
  };

  const onPointerMove = (event: PointerEvent) => {
    const point = pointOf(event);
    setCursor(point);
    if (gesture.kind === "pressing" && distance(gesture.start, point) >= DRAG_THRESHOLD) {
      setGesture({ kind: "dragging", start: gesture.start, current: point });
    } else if (gesture.kind === "dragging") {
      setGesture({ kind: "dragging", start: gesture.start, current: point });
    }
  };

  const onPointerUp = () => {
    const finished = gesture;
    setGesture({ kind: "idle" });
    if (!frame) return;
    if (finished.kind === "dragging") {
      const rect = toScreen(boxBetween(finished.start, finished.current), frame);
      if (rect.width >= 2 && rect.height >= 2) begin({ kind: "region", rect });
    } else if (finished.kind === "pressing" && hovered) {
      begin({ kind: "window", id: hovered.id });
    }
  };

  const dragSize = gesture.kind === "dragging" && frame ? toScreen(boxBetween(gesture.start, gesture.current), frame) : null;

  return (
    <div
      className="fixed inset-0 cursor-crosshair select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <motion.div
        className="pointer-events-none absolute left-0 top-0"
        style={{
          boxShadow: "0 0 0 100vmax var(--dim)",
          outline: hole ? "1px solid var(--hole-line)" : "none",
        }}
        initial={false}
        animate={hole ?? { x: cursor?.x ?? 0, y: cursor?.y ?? 0, width: 0, height: 0 }}
        // 드래그 중에는 손을 그대로 따라가고, 창 사이를 옮겨 다닐 때만 한 덩어리로 옮겨 간다.
        transition={gesture.kind === "dragging" ? { duration: 0 } : { type: "spring", visualDuration: 0.25, bounce: 0.15 }}
      />
      {dragSize && cursor && (
        <div
          className="pointer-events-none absolute rounded-[6px] bg-[#101318] px-2 text-[14px] leading-[24px] text-[#eceef2] tabular-nums"
          style={{ left: cursor.x + 16, top: cursor.y + 16 }}
        >
          {dragSize.width} × {dragSize.height}
        </div>
      )}
      {error && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[6px] bg-surface px-4 py-2 text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

function pointOf(event: PointerEvent): Point {
  return { x: event.clientX, y: event.clientY };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function contains(box: Box, point: Point) {
  return point.x >= box.x && point.x < box.x + box.width && point.y >= box.y && point.y < box.y + box.height;
}

function boxBetween(a: Point, b: Point): Box {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

async function readOverlayFrame(): Promise<OverlayFrame> {
  const overlay = getCurrentWindow();
  const [position, scale] = await Promise.all([overlay.innerPosition(), overlay.scaleFactor()]);
  return { left: position.x, top: position.y, scale };
}

function toLocal(rect: ScreenRect, frame: OverlayFrame): Box {
  const { scale } = frame;
  return {
    x: (rect.left - frame.left) / scale,
    y: (rect.top - frame.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

function toScreen(box: Box, frame: OverlayFrame): ScreenRect {
  const { scale } = frame;
  const left = Math.round(frame.left + box.x * scale);
  const top = Math.round(frame.top + box.y * scale);
  return {
    left,
    top,
    width: Math.round(frame.left + (box.x + box.width) * scale) - left,
    height: Math.round(frame.top + (box.y + box.height) * scale) - top,
  };
}
