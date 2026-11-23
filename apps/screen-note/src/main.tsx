import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Icon } from "./Icon";
import "./style.css";

const Editor = lazy(() => import("./Editor").then(module => ({ default: module.Editor })));

type Picture = { image: HTMLImageElement; name: string; id: number };

const formats = [
  { type: "image/png", name: "PNG" },
  { type: "image/jpeg", name: "JPEG" },
  { type: "image/webp", name: "WebP" },
];

function takesText(target: EventTarget | null) {
  return target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type !== "color");
}

function App() {
  const [picture, setPicture] = useState<Picture>();
  const [replacement, setReplacement] = useState<Picture>();
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const latestOpen = useRef(0);
  const edited = useRef(false);

  async function openFile(file: File) {
    const id = ++latestOpen.current;
    setError("");
    setReplacement(undefined);
    try {
      const bytes = await file.arrayBuffer();
      const url = URL.createObjectURL(new Blob([bytes], { type: file.type }));
      const image = new Image();
      try {
        image.src = url;
        await image.decode();
      } finally {
        URL.revokeObjectURL(url);
      }
      if (id !== latestOpen.current) return;
      const next = { image, name: file.name || "붙여 넣은 이미지", id };
      if (edited.current) setReplacement(next);
      else setPicture(next);
    } catch {
      if (id === latestOpen.current) {
        setError(`이미지를 열 수 없습니다. ${formats.map(format => format.name).join(", ")} 파일을 다시 선택하세요.`);
      }
    }
  }

  useEffect(() => {
    function paste(event: ClipboardEvent) {
      if (takesText(event.target)) return;
      const items = Array.from(event.clipboardData?.items ?? []);
      const file = items.find(item => item.type.startsWith("image/"))?.getAsFile();
      if (file) {
        event.preventDefault();
        void openFile(file);
      }
    }
    // 웹뷰는 놓은 파일이나 링크로 이동해 편집 화면을 닫는다. 글 입력란에 글을 놓는 경우만 웹뷰에 맡긴다.
    function allowDrop(event: DragEvent) {
      const carriesFiles = event.dataTransfer?.types.includes("Files") ?? false;
      if (!carriesFiles && takesText(event.target)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = carriesFiles ? "copy" : "none";
    }
    function drop(event: DragEvent) {
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (!files.length && takesText(event.target)) return;
      event.preventDefault();
      const file = files.find(item => item.type.startsWith("image/")) ?? files[0];
      if (file) void openFile(file);
    }
    // 배포한 앱에서 웹뷰의 새로 고침은 저장하지 않은 편집을 확인 없이 버린다.
    function blockReloadMenu(event: MouseEvent) {
      if (import.meta.env.PROD && !takesText(event.target)) event.preventDefault();
    }
    function blockReloadKey(event: KeyboardEvent) {
      const reloads = event.key === "F5" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r");
      if (import.meta.env.PROD && reloads) event.preventDefault();
    }
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    document.addEventListener("paste", paste, options);
    document.addEventListener("dragover", allowDrop, options);
    document.addEventListener("drop", drop, options);
    document.addEventListener("contextmenu", blockReloadMenu, options);
    document.addEventListener("keydown", blockReloadKey, options);
    return () => {
      listeners.abort();
      latestOpen.current++;
    };
  }, []);

  return (
    <main className={picture ? "app editing" : "app welcome"}>
      <input ref={fileInput} type="file" accept={formats.map(format => format.type).join(",")} hidden
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void openFile(file);
        }}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {replacement && (
        <div className="replacement" role="group" aria-label="편집 중인 이미지 교체">
          <span>현재 편집을 닫고 {replacement.name} 파일을 열까요?</span>
          <button onClick={() => setReplacement(undefined)}>계속 편집</button>
          <button className="primary" onClick={() => {
            edited.current = false;
            setPicture(replacement);
            setReplacement(undefined);
          }}>새 이미지 열기</button>
        </div>
      )}
      {picture ? (
        <Suspense fallback={<div className="workspace" role="status">편집기를 여는 중입니다.</div>}>
          <Editor key={picture.id} image={picture.image} name={picture.name} onOpen={() => fileInput.current?.click()}
            onEdited={value => { edited.current = value; }} />
        </Suspense>
      ) : (
        <section className="opening" aria-label="이미지 열기">
          <div className="wordmark"><Icon name="frame" />Screen Note</div>
          <div className="opening-copy">
            <h1>이미지 편집기</h1>
            <div className="opening-actions">
              <button className="primary" onClick={() => fileInput.current?.click()}>
                <Icon name="open" />이미지 열기
              </button>
              <span className="paste-hint"><kbd>{/Mac/i.test(navigator.platform) ? "⌘" : "Ctrl"}</kbd><kbd>V</kbd> 붙여넣기</span>
            </div>
          </div>
          <div className="formats" aria-label="열 수 있는 이미지 형식">{formats.map(format => format.name).join(" / ")}</div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
