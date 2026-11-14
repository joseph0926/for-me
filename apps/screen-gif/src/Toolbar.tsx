import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ButtonHTMLAttributes } from "react";

import { cancelRecording, stopRecording } from "./commands";

/** 저장이 이보다 빨리 끝나면 저장 중 표시 없이 창이 닫힌다 */
const SAVING_LABEL_DELAY_MS = 300;

type Phase = { kind: "recording" } | { kind: "saving" } | { kind: "failed"; message: string };

export function Toolbar() {
  const [startedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "recording" });
  const [showSavingLabel, setShowSavingLabel] = useState(false);

  useEffect(() => {
    if (phase.kind !== "recording") return;
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [phase.kind, startedAt]);

  useEffect(() => {
    if (phase.kind !== "saving") return;
    const timer = window.setTimeout(() => setShowSavingLabel(true), SAVING_LABEL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase.kind]);

  // 트레이 메뉴의 정지가 실패하면 Rust가 이 창으로 알린다.
  useEffect(() => {
    const unlisten = listen<string>("stop-failed", (event) => setPhase({ kind: "failed", message: event.payload }));
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);

  const onStop = () => {
    setPhase({ kind: "saving" });
    // 성공하면 Rust가 이 창을 닫고 저장한 폴더를 연다.
    stopRecording().catch((reason) => {
      setShowSavingLabel(false);
      setPhase({ kind: "failed", message: String(reason) });
    });
  };

  return (
    <motion.div
      className="flex h-full items-center gap-2 px-3"
      initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <div className="min-w-0 flex-1 truncate">
        {phase.kind === "failed" ? (
          <span className="text-[14px] text-danger" title={phase.message}>
            {phase.message}
          </span>
        ) : (
          <Rolling text={formatElapsed(elapsedSeconds)} className="text-[15px] font-semibold tabular-nums" />
        )}
      </div>
      <ToolbarButton variant="secondary" onClick={() => void cancelRecording()}>
        {phase.kind === "failed" ? "닫기" : "취소"}
      </ToolbarButton>
      <ToolbarButton variant="primary" onClick={onStop} disabled={phase.kind !== "recording"}>
        <SwapLabel labels={STOP_LABELS} current={showSavingLabel ? "저장 중" : "정지"} />
      </ToolbarButton>
    </motion.div>
  );
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const STOP_LABELS = ["정지", "저장 중"];

/**
 * 버튼 글자를 통째로 바꾼다. 새 글자는 아래 6px에서 160ms 동안 올라오고 이전 글자는 위로 100ms 안에 빠진다.
 * 모든 후보를 같은 칸에 겹쳐 두어 버튼 폭이 가장 긴 글자에 맞춰 고정된다.
 */
function SwapLabel({ labels, current }: { labels: string[]; current: string }) {
  return (
    <span className="relative inline-grid overflow-hidden">
      {labels.map((label) => (
        <span key={label} className="invisible col-start-1 row-start-1" aria-hidden>
          {label}
        </span>
      ))}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={current}
          className="col-start-1 row-start-1 text-center"
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { duration: 0.16, delay: 0.04, ease: "easeOut" } }}
          exit={{ y: -6, opacity: 0, transition: { duration: 0.1, ease: "easeOut" } }}
        >
          {current}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** 바뀐 글자만 아래에서 올라오고 이전 글자는 위로 빠진다. */
function Rolling({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex overflow-hidden ${className ?? ""}`}>
      {[...text].map((char, index) => (
        <span key={index} className="relative inline-block">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={char}
              className="inline-block whitespace-pre"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant: "primary" | "secondary" };

function ToolbarButton({ variant, className, ...props }: ToolbarButtonProps) {
  const look =
    variant === "primary"
      ? "bg-ink text-surface"
      : "border border-line bg-transparent text-ink";
  return (
    <button
      type="button"
      className={[
        "h-11 shrink-0 rounded-[6px] px-[18px] text-[14px] font-semibold",
        "transition-[filter,transform,opacity] duration-[120ms] ease-out",
        "hover:brightness-[0.88] active:scale-95 disabled:opacity-40 disabled:active:scale-100",
        "outline-none focus-visible:shadow-[0_0_0_1px_var(--ink),0_0_0_4px_color-mix(in_srgb,var(--ink)_18%,transparent)]",
        "motion-reduce:active:scale-100",
        look,
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}
