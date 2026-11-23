import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type Konva from "konva";
import { Group, Image as CanvasImage, Layer, Rect, Stage } from "react-konva";
import { Icon } from "./Icon";
import { copyImage } from "./copy";
import type { CopyResult } from "./copy";
import { currentMarks, hitMark, imagePoint, moveMark, recolorMark, selection, toolNames, visibleRegion } from "./document";
import type { BoxTool, Edit, Mark, Memo, PenStyle, Point, Region, Tool } from "./document";
import { layoutMemo, MarkOutline, MarkShape, PenPath } from "./Marks";
import { MarkSettings, PenSettings } from "./MarkSettings";

import { appendSamples, finishStroke } from "./pen";
import { hitHandle, resizeMark } from "./resize";
import type { Corner, Resizable } from "./resize";

type Props = {
  image: HTMLImageElement;
  name: string;
  onOpen: () => void;
  onEdited: (dirty: boolean) => void;
};

type Drag = { pointer: number; start: Point; end: Point } & (
  | { tool: "box"; box: BoxTool }
  | { tool: "pen"; points: number[]; style: PenStyle }
  | { tool: "resize"; id: number; original: Resizable; corner: Corner }
  | { tool: "move"; id: number; original: Mark }
);
function transformedMark(drag: Drag | null, view: Region) {
  if (drag?.tool === "resize") return resizeMark(drag.original, drag.corner, drag.start, drag.end, view);
  if (drag?.tool === "move") return moveMark(drag.original, drag.start, drag.end, view);
  return null;
}

function boxColor(tool: "cover" | "highlight") {
  return tool === "cover" ? "#191b20" : "#ee5319";
}

const toolHints: Record<Tool, string> = {
  select: "표시를 선택해 옮기거나 모서리를 끌어 크기를 바꾸세요.",
  memo: "이미지에서 메모를 놓을 곳을 누르세요.",
  crop: "남길 영역을 드래그하세요.",
  cover: "가릴 영역을 드래그하세요.",
  highlight: "테두리로 강조할 영역을 드래그하세요.",
  pen: "",
};

const tools = Object.keys(toolNames) as Tool[];

const copyMessages: Record<CopyResult, string> = {
  copied: "복사했습니다.",
  "render-failed": "복사할 이미지를 만들지 못했습니다. 자르기로 영역을 줄인 뒤 다시 시도하세요.",
  "clipboard-failed": "복사하지 못했습니다. 클립보드 접근을 확인하고 다시 시도하세요.",
};

export function Editor({ image, name, onOpen, onEdited }: Props) {
  const [tool, setTool] = useState<Tool>("memo");
  const [edits, setEdits] = useState<Edit[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const nextId = useRef(0);
  const items = useMemo(() => currentMarks(edits), [edits]);
  const selected = selectedId === null ? undefined : items.get(selectedId);
  const [drag, renderDrag] = useState<Drag | null>(null);
  // 연속 입력은 화면 갱신보다 먼저 도착할 수 있어 마지막 입력을 기준으로 획을 이어 간다.
  const activeDrag = useRef<Drag | null>(null);
  function setDrag(next: Drag | null) {
    activeDrag.current = next;
    renderDrag(next);
  }
  const [penStyle, setPenStyle] = useState<PenStyle>({ color: "#ee5319", strokeWidth: 4 });
  const [memo, setMemo] = useState<{ point: Point; text: string; id?: number } | null>(null);
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const marks = useRef<Konva.Group>(null);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const view = visibleRegion(edits, { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight });
  const scale = Math.min(space.width / view.width, space.height / view.height);
  const width = view.width * scale;
  const height = view.height * scale;
  const transform = { scaleX: scale, scaleY: scale, x: -view.x * scale, y: -view.y * scale };
  const boxPreview = drag?.tool === "box" ? selection(drag.start, drag.end) : null;
  const transformed = transformedMark(drag, view);
  const outline = transformed ?? selected;

  useLayoutEffect(() => {
    const element = workspace.current!;
    const observer = new ResizeObserver(([entry]) => {
      setSpace({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    onEdited(edits.length > 0 || Boolean(memo?.text.trim()));
  }, [edits, memo, onEdited]);

  useEffect(() => {
    if (message !== copyMessages.copied) return;
    const timer = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function pointer(event: ReactPointerEvent<HTMLDivElement>) {
    return imagePoint({ x: event.clientX, y: event.clientY }, event.currentTarget.getBoundingClientRect(), view);
  }

  function begin(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || activeDrag.current || memo || copying) return;
    setMessage("");
    const point = pointer(event);
    if (tool === "select") {
      const corner = hitHandle(selected, point, scale, view);
      if (corner && selected && selected.tool !== "pen" && selectedId !== null) {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ tool: "resize", corner, original: selected, id: selectedId, start: point, end: point, pointer: event.pointerId });
        return;
      }
      const id = hitMark(items, point, scale);
      setSelectedId(id);
      if (id === null) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ tool: "move", id, original: items.get(id)!, pointer: event.pointerId, start: point, end: point });
    } else if (tool === "memo") {
      setMemo({ point, text: "" });
    } else {
      event.currentTarget.setPointerCapture(event.pointerId);
      const input = { pointer: event.pointerId, start: point, end: point };
      setDrag(tool === "pen"
        ? { ...input, tool, points: [point.x, point.y], style: penStyle }
        : { ...input, tool: "box", box: tool });
    }
  }

  function track(event: ReactPointerEvent<HTMLDivElement>) {
    const current = activeDrag.current;
    const end = pointer(event);
    if (!current) {
      if (tool !== "select") return;
      const corner = hitHandle(selected, end, scale, view);
      const cursor = corner?.cursor ?? (hitMark(items, end, scale) === null ? "default" : "grab");
      event.currentTarget.style.setProperty("--pointer", cursor);
      return;
    }
    if (current.pointer !== event.pointerId) return;
    if (current.tool === "pen") {
      const bounds = event.currentTarget.getBoundingClientRect();
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
      const samples = coalesced.map(sample => imagePoint({ x: sample.clientX, y: sample.clientY }, bounds, view));
      samples.push(end);
      setDrag({ ...current, end, points: appendSamples(current.points, samples) });
    } else {
      setDrag({ ...current, end });
    }
  }

  function cancelDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeDrag.current?.pointer === event.pointerId) setDrag(null);
  }

  function storeMark(id: number, mark: Mark) {
    setEdits(history => [...history, { tool: "mark", id, mark }]);
    setMessage("");
  }

  function recolor(id: number, color: string) {
    setEdits(history => recolorMark(history, id, color));
    setMessage("");
  }

  function addMark(mark: Mark) {
    const id = nextId.current++;
    storeMark(id, mark);
    setSelectedId(id);
    setTool("select");
  }

  function finish(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = activeDrag.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    const end = pointer(event);
    setDrag(null);
    if (drag.tool === "pen") {
      const stroke = finishStroke(appendSamples(drag.points, [end]), drag.style);
      storeMark(nextId.current++, stroke);
      return;
    }
    if (drag.tool !== "box") {
      const changed = transformedMark({ ...drag, end }, view);
      if (changed && changed !== drag.original) storeMark(drag.id, changed);
      return;
    }
    // 누르기만 했을 때 소수점 좌표가 한 픽셀의 선택으로 반올림되는 것을 막는다.
    if (Math.abs(end.x - drag.start.x) * scale < 2 || Math.abs(end.y - drag.start.y) * scale < 2) return;
    const area = selection(drag.start, end);
    if (drag.box === "crop") {
      setEdits(history => [...history, { tool: "crop", area }]);
    } else {
      addMark({ tool: drag.box, area, strokeWidth: 3 / scale, color: boxColor(drag.box) });
    }
  }

  function updateMemo(patch: Partial<Pick<Memo, "text" | "fontSize" | "bold">>) {
    if (selectedId === null || selected?.tool !== "memo") return;
    storeMark(selectedId, layoutMemo({ ...selected, ...patch }, selected.area, view));
  }

  function applyMemo() {
    const text = memo?.text.trim();
    if (!memo || !text) return;
    if (memo.id === undefined) {
      const fontSize = Math.max(1, Math.min(4096, Math.round(20 / scale), view.width, view.height));
      addMark(layoutMemo({ text, fontSize, bold: false, color: "#ffffff" }, memo.point, view));
    } else if (selected?.tool === "memo" && text !== selected.text) {
      updateMemo({ text });
    }
    setMemo(null);
  }

  async function copy() {
    if (!marks.current) return;
    setCopying(true);
    setMessage("");
    const result = await copyImage(image, marks.current, view);
    setMessage(copyMessages[result]);
    setCopying(false);
  }

  const toolBusy = Boolean(memo || copying);
  return (
    <section className="editor" aria-label="이미지 편집" data-dragging={!!drag}>
      <header className="file-bar">
        <div className="file-info">
          <Icon name="frame" />
          <div className="file-caption">
            <span className="wordmark-small">Screen Note</span>
            <h1 className="file-name" title={name}>{name}</h1>
          </div>
          <span className="dimensions">{view.width} × {view.height} px</span>
        </div>
        <div className="file-actions">
          <button onClick={onOpen} aria-label="다른 이미지 열기"><Icon name="open" />열기</button>
          <button disabled={!edits.length || toolBusy || !!drag} onClick={() => {
            setEdits(history => history.slice(0, -1));
            setMessage("");
          }}><Icon name="undo" />되돌리기</button>
          <button className="primary" disabled={toolBusy || !!drag} onClick={copy}><Icon name="copy" />이미지 복사</button>
        </div>
      </header>
      <div className="matte">
        <div className="workspace" ref={workspace}>
          {scale > 0 && (
            <div className="sheet" style={{ width, height }}>
              <div
                className="surface"
                data-mode={tool}
                data-moving={drag?.tool === "move"}
                aria-label={toolNames[tool] + " 작업 영역"}
                style={drag?.tool === "resize" ? { cursor: drag.corner.cursor } : undefined}
                onPointerDown={begin}
                onPointerUp={finish}
                onPointerMove={track}
                onLostPointerCapture={cancelDrag}
                onPointerCancel={cancelDrag}
              >
                <Stage width={width} height={height} listening={false}>
                  <Layer {...transform} listening={false}>
                    <CanvasImage image={image} />
                  </Layer>
                  <Layer {...transform} listening={false}>
                    <Group ref={marks}>
                      {Array.from(items, ([id, mark]) => (
                        <MarkShape key={id} mark={transformed && id === selectedId ? transformed : mark} />
                      ))}
                    </Group>
                    {outline && <MarkOutline mark={outline} scale={scale} view={view} />}
                    {drag?.tool === "pen" && <PenPath x={0} y={0} points={drag.points} {...drag.style} />}
                    {boxPreview && drag?.tool === "box" && (drag.box === "crop"
                      ? <Rect {...boxPreview} stroke="white" strokeWidth={2 / scale}
                          dash={[6 / scale, 4 / scale]} fill="rgba(25, 27, 32, 0.2)" />
                      : <MarkShape mark={{ tool: drag.box, area: boxPreview, strokeWidth: 3 / scale, color: boxColor(drag.box) }} />)}
                  </Layer>
                </Stage>
              </div>
            </div>
          )}
          {memo && (
            <form className="memo" style={{
              left: Math.max(0, Math.min(space.width - 244, (space.width - width) / 2 + (memo.point.x - view.x) * scale)),
              top: Math.max(0, Math.min(space.height - 174, (space.height - height) / 2 + (memo.point.y - view.y) * scale)),
            }} onSubmit={event => { event.preventDefault(); applyMemo(); }}>
              <label htmlFor="note">메모</label>
              <textarea id="note" autoFocus rows={2} value={memo.text}
                onChange={event => setMemo({ ...memo, text: event.target.value })}
                onKeyDown={event => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                  if (event.key === "Escape") setMemo(null);
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    applyMemo();
                  }
                }} />
              <div className="actions">
                <button type="button" onClick={() => setMemo(null)}>취소</button>
                <button type="submit" className="primary" disabled={!memo.text.trim()}>적용</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <footer className="controls">
        <div className="context-row">
          {tool === "pen" ? (
            <PenSettings style={penStyle} disabled={toolBusy || !!drag} onChange={setPenStyle} />
          ) : selected?.tool === "pen" && selectedId !== null ? (
            <PenSettings style={selected} disabled={toolBusy || !!drag}
              onChange={style => {
                if (style.color !== selected.color) recolor(selectedId, style.color);
                else storeMark(selectedId, { ...selected, ...style });
              }} />
          ) : selected && selected.tool !== "pen" && selectedId !== null ? (
            <MarkSettings key={selectedId} mark={selected} disabled={toolBusy || !!drag}
              onColor={color => recolor(selectedId, color)}
              onBold={() => { if (selected.tool === "memo") updateMemo({ bold: !selected.bold }); }}
              onSize={fontSize => updateMemo({ fontSize })}
              onText={() => {
                if (selected.tool === "memo") setMemo({ id: selectedId, point: selected.area, text: selected.text });
              }} />
          ) : <span className="tool-hint">{toolHints[tool]}</span>}
          <span role="status" className="copy-status">{message}</span>
        </div>
        <div className="tools" role="group" aria-label="편집 도구">
          {tools.map(value => (
            <button key={value} aria-pressed={value === tool} disabled={toolBusy}
              onClick={() => { setDrag(null); setSelectedId(null); setTool(value); setMessage(""); }}>
              <Icon name={value} />{toolNames[value]}
            </button>
          ))}
        </div>
      </footer>
    </section>
  );
}
