// 글쓰기 창. 가운데 단 아래에서 올라와 피드를 덮고(r1 Mastodon), 첨부 사진은 가로로 크게 놓고 사진마다 원형 x로 뺀다(r4 Threads).
// 닫아도 쓰던 글은 남는다. 휴대폰 너비에서는 화면 전체를 덮는다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ClipboardEvent, type Dispatch, type DragEvent, type SetStateAction } from "react";

import { useApp } from "../app-context";
import { meId } from "../data";
import { easeOutCubic, press, sheetTransition, spring } from "../motion";
import { Avatar } from "./Avatar";
import { CloseIcon, ImageIcon } from "./Icons";

export const maxLength = 500;
export const maxPhotos = 4;
const maxPhotoBytes = 10 * 1024 * 1024;

export interface DraftPhoto {
  id: string;
  src: string;
  name: string;
  width: number;
  height: number;
}

export interface Draft {
  text: string;
  photos: DraftPhoto[];
}

export const emptyDraft: Draft = { text: "", photos: [] };

export function Composer({
  replyToId,
  draft,
  onDraftChange,
  onClose,
  onPublish,
}: {
  replyToId?: string;
  draft: Draft;
  onDraftChange: Dispatch<SetStateAction<Draft>>;
  onClose: () => void;
  onPublish: () => void;
}) {
  const { state, toast } = useApp();
  const me = state.users[meId];
  const parent = replyToId ? state.posts[replyToId] : undefined;
  const parentAuthor = parent ? state.users[parent.authorId] : undefined;
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const length = [...draft.text].length;
  const over = length > maxLength;
  const empty = draft.text.trim() === "" && draft.photos.length === 0;
  const canPublish = !empty && !over;

  useEffect(() => {
    const field = textRef.current;
    if (!field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, []);

  const addFiles = async (files: File[]) => {
    const room = maxPhotos - draft.photos.length;
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length < files.length) toast("사진 파일만 붙일 수 있어요");
    const small = images.filter((file) => file.size <= maxPhotoBytes);
    if (small.length < images.length) toast("10MB가 넘는 사진은 뺐어요");
    if (small.length > room) toast(`사진은 ${maxPhotos}장까지 붙일 수 있어요`);

    const loaded = await Promise.all(small.slice(0, Math.max(room, 0)).map(readPhoto));
    const usable = loaded.filter((photo): photo is DraftPhoto => photo !== null);
    if (usable.length < loaded.length) toast("열 수 없는 사진이 있어 뺐어요");
    if (usable.length === 0) return;
    // 읽는 동안 다른 사진이 붙었을 수 있어 최신 초안 기준으로 다시 자른다.
    onDraftChange((current) => {
      const photos = [...current.photos, ...usable];
      for (const extra of photos.slice(maxPhotos)) URL.revokeObjectURL(extra.src);
      return { ...current, photos: photos.slice(0, maxPhotos) };
    });
  };

  const removePhoto = (id: string) => {
    const photo = draft.photos.find((item) => item.id === id);
    if (photo) URL.revokeObjectURL(photo.src);
    onDraftChange((current) => ({ ...current, photos: current.photos.filter((item) => item.id !== id) }));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void addFiles([...event.dataTransfer.files]);
  };

  const onPaste = (event: ClipboardEvent) => {
    const files = [...event.clipboardData.files];
    if (files.length === 0) return;
    event.preventDefault();
    void addFiles(files);
  };

  return (
    <motion.section
      role="dialog"
      aria-label={parent ? "답글 쓰기" : "새 글 쓰기"}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={sheetTransition}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canPublish) onPublish();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
      className={`pointer-events-auto flex h-dvh flex-col bg-[var(--surface)] shadow-[0_-12px_32px_rgb(0_0_0/0.12)] transition-[background-color] duration-150 md:h-auto md:max-h-[min(640px,80dvh)] md:rounded-t-md md:border md:border-b-0 md:border-[var(--line)] ${
        dragging ? "bg-[var(--accent-soft)]" : ""
      }`}
    >
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <h2 className="flex-1 text-[17px] font-[650]">{parent ? "답글" : "새 글"}</h2>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
        >
          <CloseIcon size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {parent && parentAuthor && (
          <div className="flex gap-3 pb-1">
            <div className="flex flex-col items-center">
              <Avatar user={parentAuthor} size={32} />
              <span className="mt-1 w-0.5 flex-1 rounded-full bg-[var(--line)]" />
            </div>
            <div className="min-w-0 flex-1 pb-3">
              <div className="text-[14px] font-[650]">{parentAuthor.name}</div>
              <p className="line-clamp-2 text-[14px] leading-[1.5] text-[var(--muted)]">{parent.text}</p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Avatar user={me} size={parent ? 32 : 40} />
          <div className="min-w-0 flex-1">
            {parentAuthor && <div className="text-[14px] text-[var(--muted)]">@{parentAuthor.handle} 님에게 답글</div>}
            <textarea
              ref={textRef}
              value={draft.text}
              onChange={(event) => {
                const text = event.target.value;
                onDraftChange((current) => ({ ...current, text }));
              }}
              onPaste={onPaste}
              placeholder={parent ? "답글을 남겨 보세요" : "무슨 일이 있었나요?"}
              aria-label="본문"
              rows={4}
              className="field-sizing-content block min-h-24 w-full resize-none bg-transparent py-1.5 text-[16px] leading-[1.55] outline-none placeholder:text-[var(--faint)] md:text-[15px]"
            />
            <PhotoStrip photos={draft.photos} onRemove={removePhoto} />
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-1 px-3 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label={`사진 붙이기 (${draft.photos.length}/${maxPhotos})`}
          disabled={draft.photos.length >= maxPhotos}
          onClick={() => fileRef.current?.click()}
          className="grid size-9 place-items-center rounded-md text-[var(--accent)] hover:bg-[var(--hover)] disabled:opacity-40"
        >
          <ImageIcon size={20} />
        </button>
        <span className="flex-1" />
        <LengthMeter length={length} />
        <motion.button
          type="button"
          whileTap={canPublish ? press : undefined}
          disabled={!canPublish}
          onClick={onPublish}
          className="ml-3 h-11 rounded-md bg-[var(--ink)] px-[18px] text-[14px] font-semibold text-[var(--surface)] transition-[filter,opacity] duration-150 hover:brightness-[0.88] disabled:opacity-40 disabled:hover:brightness-100"
        >
          {parent ? "답글 올리기" : "올리기"}
        </motion.button>
      </footer>
    </motion.section>
  );
}

function PhotoStrip({ photos, onRemove }: { photos: DraftPhoto[]; onRemove: (id: string) => void }) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] ${photos.length > 0 ? "mt-2" : ""}`}>
      <AnimatePresence initial={false}>
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            layout
            initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
            transition={{ ...spring, opacity: { duration: 0.22, ease: easeOutCubic }, filter: { duration: 0.22 } }}
            className="relative h-40 shrink-0 overflow-hidden rounded-md bg-[var(--hover)]"
            style={{ aspectRatio: Math.min(Math.max(photo.width / photo.height, 0.6), 1.8) }}
          >
            <img src={photo.src} alt={photo.name} className="size-full object-cover" />
            <button
              type="button"
              aria-label={`${photo.name} 빼기`}
              onClick={() => onRemove(photo.id)}
              className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/75"
            >
              <CloseIcon size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// 쓴 글자 수와 한도(r1의 91/500). 넘치면 장밋빛으로 바뀌고 올리기를 막는다.
function LengthMeter({ length }: { length: number }) {
  const left = maxLength - length;
  return (
    <span aria-live="polite" className={`text-[14px] tabular-nums ${left < 0 ? "font-semibold text-[var(--like)]" : "text-[var(--faint)]"}`}>
      {length}/{maxLength}
    </span>
  );
}

function readPhoto(file: File): Promise<DraftPhoto | null> {
  const src = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({ id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 6)}`, src, name: file.name, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => {
      URL.revokeObjectURL(src);
      resolve(null);
    };
    image.src = src;
  });
}
