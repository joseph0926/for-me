// 손질: PC 이미지 편집기. 왼쪽 도구 열, 위 옵션 막대, 가운데 작업 화면, 오른쪽 조정 패널(r1), 아래 필터 줄(r5).
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";

import { AdjustPanel } from "./components/AdjustPanel";
import { FilterStrip } from "./components/FilterStrip";
import { ChevronDown, CompareIcon, CopyIcon, DownloadIcon, ImageIcon, ImportIcon, RedoIcon, UndoIcon, ZoomInIcon, ZoomOutIcon } from "./components/Icons";
import { MenuList } from "./components/MenuList";
import { OptionBar } from "./components/OptionBar";
import { Popover } from "./components/Popover";
import { Stage, type Zoom } from "./components/Stage";
import { Toasts, maxToasts, type Toast } from "./components/Toasts";
import { ToolRail } from "./components/ToolRail";
import { centeredRect, cropOf, turnedSize, type Size } from "./editor/geometry";
import { render } from "./editor/render";
import { historyReducer, initialEdit, isEdited, type EditState, type Mark } from "./editor/state";
import { resolveRatio, toolList, type MarkStyle, type Tool } from "./tools";

interface OpenImage {
  image: HTMLImageElement;
  name: string;
  size: Size;
  // 사용자가 연 파일은 object URL이라 다른 이미지를 열 때 해제한다.
  objectUrl: string | null;
}

const samples = [
  { file: "coast.jpg", name: "바위 해안.jpg" },
  { file: "peak.jpg", name: "설산.jpg" },
  { file: "city.jpg", name: "도시 내려다보기.jpg" },
  { file: "berries.jpg", name: "산딸기.jpg" },
];

const zoomSteps = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const maxOpenBytes = 50 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

export function App() {
  const [doc, setDoc] = useState<OpenImage | null>(null);
  const [history, dispatch] = useReducer(historyReducer, { past: [], present: initialEdit, future: [], lastKey: null });
  const [tool, setTool] = useState<Tool>("adjust");
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [scaleInfo, setScaleInfo] = useState({ scale: 1, fit: 1 });
  const [compare, setCompare] = useState(false);
  const [cropRatio, setCropRatio] = useState<number | null>(null);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [markStyle, setMarkStyle] = useState<MarkStyle>({ color: "#ff4d4f", width: 8, textSize: 64, shape: "rect" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dropping, setDropping] = useState(false);
  const [opening, setOpening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const edit = history.present;
  const edited = isEdited(edit);
  const selectedMark = edit.marks.find((mark) => mark.id === selectedMarkId) ?? null;

  const showToast = (message: string) => setToasts((current) => [...current, { id: Date.now() + Math.random(), message }].slice(-maxToasts));
  const dismissToast = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const onEdit = useCallback((next: EditState, key?: string) => dispatch({ type: "set", next, key }), []);
  const onSeal = useCallback(() => dispatch({ type: "seal" }), []);
  const onScale = useCallback((scale: number, fit: number) => setScaleInfo({ scale, fit }), []);

  const openImage = async (src: string, name: string, objectUrl: string | null) => {
    setOpening(true);
    try {
      const image = await loadImage(src);
      if (doc?.objectUrl) URL.revokeObjectURL(doc.objectUrl);
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      setDoc({ image, name, size, objectUrl });
      dispatch({ type: "reset", next: initialEdit });
      setZoom("fit");
      setCompare(false);
      setCropRatio(null);
      setSelectedMarkId(null);
      // 표시 굵기와 글자 크기는 이미지 크기에 비례한 값에서 시작한다.
      const long = Math.max(size.width, size.height);
      setMarkStyle((style) => ({ ...style, width: Math.max(2, Math.round(long / 250)), textSize: Math.max(12, Math.round(long / 22)) }));
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      showToast(`${name}을 열지 못했습니다. PNG, JPEG, WebP, GIF 이미지를 쓰세요`);
    } finally {
      setOpening(false);
    }
  };

  const openFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast(`${file.name}은 이미지가 아닙니다`);
    if (file.size > maxOpenBytes) return showToast(`${file.name}은 50MB를 넘습니다`);
    const url = URL.createObjectURL(file);
    void openImage(url, file.name, url);
  };

  // 저장은 원본 해상도로 다시 그린다. 화면 배율과 관계없다.
  const exportBlob = (type: "image/png" | "image/jpeg"): Promise<Blob> =>
    new Promise((resolve, reject) => {
      if (!doc) return reject(new Error("열린 이미지가 없습니다"));
      const canvas = document.createElement("canvas");
      render(canvas, doc.image, doc.size, edit, { scale: 1 });
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지를 만들지 못했습니다"))), type, 0.92);
    });

  const download = async (type: "image/png" | "image/jpeg") => {
    if (!doc) return;
    try {
      const blob = await exportBlob(type);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const base = doc.name.replace(/\.[^.]+$/, "");
      link.href = url;
      link.download = `${base}-편집.${type === "image/png" ? "png" : "jpg"}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`${link.download}로 내려받았습니다`);
    } catch (error) {
      showToast((error as Error).message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": exportBlob("image/png") })]);
      showToast("이미지를 복사했습니다");
    } catch {
      showToast("클립보드에 복사하지 못했습니다. 내려받기를 쓰세요");
    }
  };

  const changeTool = (next: Tool) => {
    setTool(next);
    if (next !== "select") setSelectedMarkId(null);
    if (next === "crop") setCompare(false);
  };

  const changeCropRatio = (ratio: number | null) => {
    if (!doc) return;
    setCropRatio(ratio);
    onEdit({ ...edit, crop: ratio === null ? edit.crop : centeredRect(turnedSize(doc.size, edit), resolveRatio(ratio, doc.size, edit)) });
  };

  const rotate = (direction: 1 | -1) => {
    // 90도 돌리면 판의 가로세로가 바뀌므로 자르기 범위는 새 판에서 다시 시작한다.
    onEdit({ ...edit, rotation: (((edit.rotation + direction * 90) % 360) + 360) % 360 as EditState["rotation"], crop: null });
    setCropRatio(null);
  };

  const patchMark = (patch: Partial<{ color: string; width: number; size: number }>, key?: string) => {
    if (!selectedMark) return;
    const next = edit.marks.map((mark): Mark => {
      if (mark.id !== selectedMark.id) return mark;
      if (mark.kind === "text") return { ...mark, color: patch.color ?? mark.color, size: patch.size ?? mark.size };
      return { ...mark, color: patch.color ?? mark.color, width: patch.width ?? mark.width };
    });
    onEdit({ ...edit, marks: next }, key);
  };

  const deleteMark = () => {
    if (!selectedMark) return;
    onEdit({ ...edit, marks: edit.marks.filter((mark) => mark.id !== selectedMark.id) });
    setSelectedMarkId(null);
  };

  const stepZoom = (direction: 1 | -1) => {
    const current = scaleInfo.scale;
    const next = direction > 0 ? zoomSteps.find((step) => step > current * 1.1) : [...zoomSteps].reverse().find((step) => step < current / 1.1);
    setZoom(next ?? (direction > 0 ? 4 : 0.1));
  };

  // 단축키. 입력칸에서는 받지 않는다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [role='menu']")) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if (mod && event.key.toLowerCase() === "s" && doc) {
        event.preventDefault();
        void download("image/png");
        return;
      }
      if (mod && event.key.toLowerCase() === "o") {
        event.preventDefault();
        fileInput.current?.click();
        return;
      }
      if (mod || !doc) return;
      const toolHit = toolList.find((item) => item.key.toLowerCase() === event.key.toLowerCase());
      if (toolHit) changeTool(toolHit.id);
      else if (event.key === "+" || event.key === "=") stepZoom(1);
      else if (event.key === "-") stepZoom(-1);
      else if (event.key === "0") setZoom("fit");
      else if (event.key === "1") setZoom(1);
      else if (event.key === "\\") setCompare((value) => !value);
      else if ((event.key === "Delete" || event.key === "Backspace") && selectedMark) deleteMark();
      else if (event.key === "Escape") setSelectedMarkId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 붙여넣기와 끌어 놓기로 이미지를 연다.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const onPaste = (event: ClipboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea")) return;
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
      if (file) openFile(file);
    };
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDropping(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDropping(false);
    };
    const onOver = (event: DragEvent) => hasFiles(event) && event.preventDefault();
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDropping(false);
      const files = [...(event.dataTransfer?.files ?? [])];
      if (files.length > 1) showToast("한 번에 한 장만 엽니다. 첫 파일을 열었습니다");
      openFile(files[0]);
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  });

  const crop = doc ? cropOf(doc.size, edit) : null;

  return (
    <div className="flex h-dvh flex-col bg-[var(--surface)]">
      <header className="flex h-12 shrink-0 items-center gap-2 px-2 sm:px-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--ink)] text-[12px] font-bold text-[var(--surface)]">손</span>
        {doc ? (
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="truncate leading-tight font-[650]">
              {doc.name}
              {edited && <span className="ml-1.5 text-[13px] font-normal text-[var(--faint)]">편집됨</span>}
            </p>
            <p className="text-[13px] leading-tight tabular-nums text-[var(--muted)]">
              {crop ? `${Math.round(crop.w)} x ${Math.round(crop.h)}px` : ""}
            </p>
          </div>
        ) : (
          <p className="flex-1 font-[650]">손질</p>
        )}

        {doc && (
          <>
            <div className="ml-auto flex items-center gap-0.5 sm:ml-6">
              <HeaderButton label="되돌리기 (Ctrl+Z)" disabled={history.past.length === 0} onClick={() => dispatch({ type: "undo" })}>
                <UndoIcon size={18} />
              </HeaderButton>
              <HeaderButton label="다시 하기 (Ctrl+Shift+Z)" disabled={history.future.length === 0} onClick={() => dispatch({ type: "redo" })}>
                <RedoIcon size={18} />
              </HeaderButton>
              <span className="mx-1.5 hidden h-5 w-px bg-[var(--line)] sm:block" />
              <span className="hidden items-center sm:flex">
                <HeaderButton label="축소 (-)" onClick={() => stepZoom(-1)}>
                  <ZoomOutIcon size={18} />
                </HeaderButton>
                <button
                  type="button"
                  aria-label="화면에 맞추기 (0)"
                  aria-pressed={zoom === "fit"}
                  onClick={() => setZoom(zoom === "fit" ? 1 : "fit")}
                  className="h-8 w-[4.5rem] rounded-md text-[13px] tabular-nums hover:bg-[var(--hover)]"
                >
                  {zoom === "fit" ? `맞춤 ${Math.round(scaleInfo.fit * 100)}%` : `${Math.round(scaleInfo.scale * 100)}%`}
                </button>
                <HeaderButton label="확대 (+)" onClick={() => stepZoom(1)}>
                  <ZoomInIcon size={18} />
                </HeaderButton>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <HeaderButton label="원본과 비교 (\)" pressed={compare} disabled={tool === "crop"} onClick={() => setCompare((value) => !value)}>
                <CompareIcon size={18} />
              </HeaderButton>
              <TwoStepButton
                armed={edited}
                label="열기"
                armedLabel="편집 버리고 열기"
                onConfirm={() => fileInput.current?.click()}
              />
              <Popover
                align="right"
                ariaLabel="저장"
                label={
                  <>
                    <DownloadIcon size={17} />
                    <span className="hidden sm:inline">저장</span>
                    <ChevronDown size={14} />
                  </>
                }
              >
                {(close) => (
                  <div className="w-52">
                    <MenuList
                      entries={[
                        { key: "png", label: <><DownloadIcon size={16} />PNG로 내려받기</>, hint: "Ctrl+S", onSelect: () => { close(); void download("image/png"); } },
                        { key: "jpg", label: <><DownloadIcon size={16} />JPEG로 내려받기</>, onSelect: () => { close(); void download("image/jpeg"); } },
                        { key: "copy", label: <><CopyIcon size={16} />이미지 복사</>, onSelect: () => { close(); void copy(); } },
                      ]}
                    />
                  </div>
                )}
              </Popover>
            </div>
          </>
        )}
      </header>

      {doc ? (
        <div className="flex min-h-0 flex-1 max-md:flex-col">
          <ToolRail tool={tool} onTool={changeTool} />
          <div className="flex min-w-0 flex-1 flex-col">
            <OptionBar
              tool={tool}
              edit={edit}
              markStyle={markStyle}
              onMarkStyle={setMarkStyle}
              cropRatio={cropRatio}
              onCropRatio={changeCropRatio}
              onRotate={rotate}
              onFlip={(axis) => onEdit(axis === "h" ? { ...edit, flipH: !edit.flipH } : { ...edit, flipV: !edit.flipV })}
              onResetGeometry={() => {
                onEdit({ ...edit, rotation: 0, flipH: false, flipV: false, straighten: 0, crop: null });
                setCropRatio(null);
              }}
              onFilterAmount={(amount) => onEdit({ ...edit, filter: { ...edit.filter, amount } }, "filter-amount")}
              onFilterCommit={onSeal}
              selectedMark={tool === "select" ? selectedMark : null}
              onMarkChange={patchMark}
              onMarkDelete={deleteMark}
            />
            <Stage
              image={doc.image}
              source={doc.size}
              edit={edit}
              tool={tool}
              zoom={zoom}
              compare={compare && tool !== "crop"}
              markStyle={markStyle}
              lockedRatio={resolveRatio(cropRatio, doc.size, edit)}
              selectedMarkId={selectedMarkId}
              onSelectMark={setSelectedMarkId}
              onEdit={onEdit}
              onSeal={onSeal}
              onScale={onScale}
            />
            <AnimatePresence initial={false}>
              {tool === "filter" && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }} className="overflow-hidden">
                  <FilterStrip image={doc.image} source={doc.size} edit={edit} onPick={(id) => onEdit({ ...edit, filter: { id, amount: id === edit.filter.id ? edit.filter.amount : 100 } })} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {tool === "adjust" && (
            <aside aria-label="조정" className="shrink-0 overflow-y-auto bg-[var(--panel)] thin-scroll max-md:max-h-[42dvh] md:w-[300px]">
              <AdjustPanel edit={edit} onEdit={onEdit} onSeal={onSeal} />
            </aside>
          )}
        </div>
      ) : (
        <EmptyWorkspace opening={opening} onOpen={() => fileInput.current?.click()} onSample={(sample) => void openImage(`samples/${sample.file}`, sample.name, null)} />
      )}

      <AnimatePresence>
        {dropping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-md border-2 border-dashed border-[var(--ink)] bg-[var(--surface)]/85 backdrop-blur-sm"
          >
            <p className="flex items-center gap-2 text-[16px] font-[650]">
              <ImportIcon size={22} />
              {doc && edited ? "놓으면 지금 편집을 버리고 엽니다" : "놓아서 열기"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          openFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}

// 빈 작업 공간. 안쪽 전체를 눌러 열 수 있게 하고 점선 경계와 아이콘으로 표시한다(tastepin 편집기 버튼).
function EmptyWorkspace({ opening, onOpen, onSample }: { opening: boolean; onOpen: () => void; onSample: (sample: (typeof samples)[number]) => void }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        className="group grid min-h-0 flex-1 place-items-center rounded-md border-2 border-dashed border-[var(--line)] text-[var(--muted)] transition-colors hover:border-[var(--faint)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
      >
        <span className="flex flex-col items-center gap-3">
          <ImageIcon size={40} />
          <span className="text-[16px] font-[650] text-[var(--ink)]">{opening ? "여는 중" : "이미지 열기"}</span>
          <span className="text-[14px]">누르거나 파일을 끌어다 놓거나 Ctrl+V로 붙여 넣기</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-3 overflow-x-auto thin-scroll">
        <span className="shrink-0 text-[var(--muted)]">견본</span>
        {samples.map((sample) => (
          <button
            key={sample.file}
            type="button"
            onClick={() => onSample(sample)}
            disabled={opening}
            aria-label={`견본 ${sample.name} 열기`}
            className="h-16 w-24 shrink-0 overflow-hidden rounded-md ring-[var(--ink)] hover:ring-2"
          >
            <img src={`samples/${sample.file}`} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
    </main>
  );
}

function HeaderButton({ label, pressed, disabled, onClick, children }: { label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-md hover:bg-[var(--hover)] disabled:opacity-35 disabled:hover:bg-transparent ${pressed ? "bg-[var(--accent-soft)] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
    >
      {children}
    </motion.button>
  );
}

// 편집한 것이 있으면 같은 자리를 3초 안에 한 번 더 눌러야 다른 이미지를 연다(tastepin 삭제 확인).
function TwoStepButton({ armed: needsConfirm, label, armedLabel, onConfirm }: { armed: boolean; label: string; armedLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={() => {
        if (!needsConfirm || armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 whitespace-nowrap ${armed ? "bg-[#d8383e] font-[650] text-white" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"}`}
    >
      <ImportIcon size={17} />
      <span className={armed ? "" : "hidden sm:inline"}>{armed ? armedLabel : label}</span>
    </motion.button>
  );
}
