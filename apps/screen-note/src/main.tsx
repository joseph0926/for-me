import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Icon } from "./Icon";
import { StudioHeader } from "./Studio";
import { GifViewer } from "./GifViewer";
import "./style.css";

const Editor = lazy(() => import("./Editor").then(module => ({ default: module.Editor })));

type Picture = { name: string; id: number } & (
  | { kind: "still"; image: HTMLImageElement }
  | { kind: "gif"; blob: Blob; width: number; height: number }
);

const formats = [
  { type: "image/png", name: "PNG" },
  { type: "image/jpeg", name: "JPEG" },
  { type: "image/webp", name: "WebP" },
  { type: "image/gif", name: "GIF" },
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

  async function openImage(name: string, read: () => Promise<Blob>) {
    const id = ++latestOpen.current;
    setError("");
    setReplacement(undefined);
    try {
      const blob = await read();
      if (id !== latestOpen.current) return;
      // 운영체제에서 연 파일과 클립보드에서는 파일 이름이나 MIME 형식이 비어 있을 수 있다.
      const signature = await blob.slice(0, 6).text();
      const gif = signature === "GIF87a" || signature === "GIF89a"
        ? blob.slice(0, blob.size, "image/gif") : undefined;
      const url = URL.createObjectURL(gif ?? blob);
      const image = new Image();
      try {
        image.src = url;
        await image.decode();
      } finally {
        URL.revokeObjectURL(url);
      }
      if (id !== latestOpen.current) return;
      const file = { id, name: name || "붙여 넣은 이미지" };
      const next: Picture = gif
        ? { ...file, kind: "gif", blob: gif, width: image.naturalWidth, height: image.naturalHeight }
        : { ...file, kind: "still", image };
      if (edited.current) setReplacement(next);
      else setPicture(next);
    } catch (reason) {
      if (id === latestOpen.current) {
        setError(typeof reason === "string" ? reason : `이미지를 열 수 없습니다. ${formats.map(format => format.name).join(", ")} 파일을 다시 선택하세요.`);
      }
    }
  }

  function openFile(file: File) {
    return openImage(file.name, async () => new Blob([await file.arrayBuffer()], { type: file.type }));
  }

  useEffect(() => {
    let active = true;
    const core = window.__TAURI__?.core;
    if (core) {
      const fileManager = /Mac/i.test(navigator.platform) ? "Finder" : "파일 탐색기";
      const channel = new core.Channel<[number, string]>();
      channel.onmessage = ([id, name]) => {
        if (active) void openImage(name, async () => {
          const bytes = await core.invoke<ArrayBuffer>("read_opened_image", { id });
          return new Blob([bytes]);
        });
      };
      void core.invoke("listen_opened_files", { channel }).catch(() => {
        if (active) setError(`${fileManager}에서 파일을 열 수 없습니다. 이미지 열기 버튼을 사용하세요.`);
      });
    }
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
      active = false;
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
          <button onClick={() => setReplacement(undefined)}>현재 이미지 유지</button>
          <button className="primary" onClick={() => {
            edited.current = false;
            setPicture(replacement);
            setReplacement(undefined);
          }}>새 이미지 열기</button>
        </div>
      )}
      {picture?.kind === "gif" ? (
        <GifViewer key={picture.id} blob={picture.blob} name={picture.name} width={picture.width}
          height={picture.height} onOpen={() => fileInput.current?.click()} />
      ) : picture ? (
        <Suspense fallback={<div className="workspace" role="status">편집기를 여는 중입니다.</div>}>
          <Editor key={picture.id} image={picture.image} name={picture.name} onOpen={() => fileInput.current?.click()}
            onEdited={value => { edited.current = value; }} />
        </Suspense>
      ) : (
        <section className="studio empty-studio view-studio" aria-label="이미지 작업 공간">
          <StudioHeader onOpen={() => fileInput.current?.click()} />
          <div className="empty-stage">
            <button className="drop-zone" aria-label="이미지 열기" onClick={() => fileInput.current?.click()}>
              <span className="empty-art" aria-hidden="true"><Icon name="picture" /></span>
              <span className="drop-title">이미지 열기</span>
              <span className="drop-help">여기를 누르거나 이미지 파일을 끌어다 놓으세요.</span>
              <span className="paste-hint"><kbd>{/Mac/i.test(navigator.platform) ? "⌘" : "Ctrl"}</kbd><kbd>V</kbd>붙여넣기</span>
            </button>
          </div>
          <footer className="studio-status"><span>지원 형식</span><span>{formats.map(format => format.name).join(" / ")}</span></footer>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
