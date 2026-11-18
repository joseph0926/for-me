import { motion } from "motion/react";
import { useEffect, useState } from "react";

import type { Reference, Topic } from "../../topic.ts";
import { captureUrl, referenceNumber } from "./topics.ts";

interface Props {
  topic: Topic;
  reference: Reference;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({ topic, reference, index, onIndexChange, onClose }: Props) {
  const count = reference.captures.length;
  const name = reference.captures[index];
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < count - 1) onIndexChange(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [count, index, onClose, onIndexChange]);

  if (!name) return null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${reference.product} ${reference.title}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white"
      onClick={onClose}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6" onClick={(event) => event.stopPropagation()}>
        <span className="grid h-5 min-w-5 place-items-center rounded-md bg-white/15 px-1 text-[11.5px] font-semibold tabular-nums">
          {referenceNumber(reference)}
        </span>
        <p className="min-w-0 flex-1 truncate text-[13.5px]">
          <span className="font-medium">{reference.product}</span>
          <span className="ml-2 text-white/60">{reference.title}</span>
        </p>
        {count > 1 && (
          <span className="text-[12.5px] text-white/60 tabular-nums">
            {index + 1} / {count}
          </span>
        )}
        <a
          href={reference.url}
          target="_blank"
          rel="noreferrer"
          className="hidden text-[12.5px] text-white/70 hover:text-white sm:inline"
        >
          원본 열기 ↗
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="grid size-8 place-items-center rounded-full text-[18px] hover:bg-white/10"
        >
          ×
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16">
        {failed === name ? (
          <p className="text-[13px] text-white/60">이 사본에 캡처 파일이 없습니다</p>
        ) : (
          <motion.img
            key={name}
            src={captureUrl(topic, name)}
            alt={`${reference.product} ${reference.title} ${index + 1}`}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            onError={() => setFailed(name)}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[calc(100dvh-5rem)] max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}
        {index > 0 && <StepButton side="left" onClick={() => onIndexChange(index - 1)} />}
        {index < count - 1 && <StepButton side="right" onClick={() => onIndexChange(index + 1)} />}
      </div>
    </motion.div>
  );
}

function StepButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "이전 캡처" : "다음 캡처"}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`
        absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full
        bg-white/10 text-[18px] backdrop-blur hover:bg-white/20
        ${side === "left" ? "left-3 sm:left-5" : "right-3 sm:right-5"}
      `}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
