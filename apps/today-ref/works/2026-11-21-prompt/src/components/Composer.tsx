// 둥근 입력창 하나에 첨부 칸, 글줄, 용도와 대상 선택, 보내기 버튼을 담는다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { purposeLabel, purposes, targetLabel, targets } from "../generate";
import { MAX_IMAGES, type Draft } from "../useDraft";
import { ArrowUpIcon, CheckIcon, ChevronDownIcon, CloseIcon, ImageIcon, PlusIcon, StopIcon, TagIcon } from "./icons";

interface ComposerProps {
  draft: Draft;
  busy: boolean;
  following: boolean;
  onSubmit: () => void;
  onStop: () => void;
}

export function Composer({ draft, busy, following, onSubmit, onStop }: ComposerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);

  // 예시를 골라 글이 바뀌어도 높이가 맞도록 글이 바뀔 때마다 입력칸 높이를 다시 잰다.
  useLayoutEffect(() => fitHeight(textArea.current), [draft.text]);

  // 처음 그릴 때 아직 폭이 정해지지 않으면 안내 문구가 여러 줄로 재어지므로, 폭이 바뀔 때도 다시 잰다.
  useEffect(() => {
    const field = textArea.current;
    if (!field) return;
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth === width) return;
      width = field.clientWidth;
      fitHeight(field);
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  const compact = following && draft.attachments.length === 0;
  const placeholder = following
    ? "결과를 어떻게 바꿀지 적어 주세요"
    : draft.attachments.length > 0
      ? "이 이미지로 무엇을 만들지 덧붙여 주세요"
      : "만들고 싶은 결과를 적어 주세요";

  function submit() {
    if (busy || !draft.canSend) return;
    onSubmit();
    textArea.current?.focus();
  }

  return (
    <div className="w-full">
      <div
        className={`composer ${dragging ? "composer-drop" : ""}`}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          draft.addFiles([...event.dataTransfer.files]);
        }}
      >
        {/* 이어서 쓸 때는 화면을 덜 가리도록 첨부가 있을 때만 첨부 줄을 펼치고, 붙이기 버튼은 아래 도구 줄로 옮긴다. */}
        <div className={compact ? "hidden" : "flex flex-wrap gap-2 px-3 pt-3"}>
          <AnimatePresence initial={false}>
            {draft.attachments.map((attachment) => (
              <motion.div
                key={attachment.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="attachment"
              >
                <img src={attachment.url} alt={attachment.name} className="size-full rounded-[inherit] object-cover" />
                {attachment.status === "reading" && (
                  <span className="attachment-state" role="status">
                    <span className="spinner" aria-hidden="true" />
                    <span className="sr-only">{attachment.name} 읽는 중</span>
                  </span>
                )}
                {attachment.status === "failed" && (
                  <span className="attachment-state attachment-failed" title={attachment.error}>
                    읽기 실패
                  </span>
                )}
                <button type="button" className="attachment-remove" onClick={() => draft.remove(attachment.id)} aria-label={`${attachment.name} 빼기`}>
                  <CloseIcon size={12} strokeWidth={2.4} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {draft.attachments.length < MAX_IMAGES && (
            <button type="button" className="attachment-add" onClick={() => fileInput.current?.click()} aria-label="이미지 붙이기">
              <PlusIcon size={20} />
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            draft.addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />

        <label className="sr-only" htmlFor="composer-text">
          요청
        </label>
        <textarea
          id="composer-text"
          ref={textArea}
          rows={1}
          value={draft.text}
          placeholder={placeholder}
          onChange={(event) => draft.setText(event.target.value)}
          onPaste={(event) => {
            const files = [...event.clipboardData.files];
            if (files.length === 0) return;
            event.preventDefault();
            draft.addFiles(files);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            submit();
          }}
          className="composer-text"
        />

        <div className="flex items-center gap-2 px-3 pb-3">
          {compact && (
            <button type="button" className="tool-button" onClick={() => fileInput.current?.click()} aria-label="이미지 붙이기" title="이미지 붙이기">
              <ImageIcon size={18} />
            </button>
          )}
          <PurposePicker draft={draft} />
          <TargetPicker draft={draft} />
          <div className="ml-auto">
            {busy ? (
              <button type="button" className="send-button" onClick={onStop} aria-label="쓰기 멈추기">
                <StopIcon size={18} />
              </button>
            ) : (
              <button type="button" className="send-button" onClick={submit} disabled={!draft.canSend} aria-label="프롬프트 만들기">
                <ArrowUpIcon size={18} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="min-h-5 px-4 pt-1.5 text-[13px] text-[var(--danger)]" role="status" aria-live="polite">
        {draft.notice}
      </p>
    </div>
  );
}

function fitHeight(field: HTMLTextAreaElement | null) {
  if (!field) return;
  field.style.height = "auto";
  field.style.height = `${Math.min(field.scrollHeight, 220)}px`;
}

function PurposePicker({ draft }: { draft: Draft }) {
  if (draft.purpose) {
    return (
      <span className="chip chip-selected">
        <TagIcon size={14} />
        {purposeLabel(draft.purpose)}
        <button type="button" onClick={() => draft.setPurpose(null)} aria-label={`용도 ${purposeLabel(draft.purpose)} 빼기`} className="-mr-1 rounded-[4px] p-0.5 hover:bg-black/5">
          <CloseIcon size={12} strokeWidth={2.4} />
        </button>
      </span>
    );
  }
  return (
    <Menu
      label={
        <>
          <PlusIcon size={14} />
          용도
        </>
      }
      buttonClass="chip"
      ariaLabel="용도 고르기"
      items={purposes.map((item) => ({ id: item.id, label: item.label, selected: false }))}
      onSelect={(id) => draft.setPurpose(id as (typeof purposes)[number]["id"])}
    />
  );
}

function TargetPicker({ draft }: { draft: Draft }) {
  return (
    <Menu
      label={
        <>
          {targetLabel(draft.target)}
          <ChevronDownIcon size={14} />
        </>
      }
      buttonClass="target-button"
      ariaLabel={`프롬프트를 받을 대상: ${targetLabel(draft.target)}`}
      items={targets.map((item) => ({ id: item.id, label: item.label, selected: item.id === draft.target }))}
      onSelect={(id) => draft.setTarget(id as (typeof targets)[number]["id"])}
    />
  );
}

interface MenuProps {
  label: ReactNode;
  ariaLabel: string;
  buttonClass: string;
  items: { id: string; label: string; selected: boolean }[];
  onSelect: (id: string) => void;
}

function Menu({ label, ariaLabel, buttonClass, items, onSelect }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button type="button" className={buttonClass} aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            // tastepin 메뉴 패널 값: 스프링 없이 220ms 곡선으로 열고 같은 길로 닫는다.
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
            className="menu"
          >
            {items.map((item) => (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={item.selected}
                  className="menu-item"
                  onClick={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                >
                  {item.label}
                  {item.selected && <CheckIcon size={16} className="ml-auto text-[var(--accent)]" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
