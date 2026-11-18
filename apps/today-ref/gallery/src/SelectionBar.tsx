import { AnimatePresence, motion } from "motion/react";

import type { Topic } from "../../topic.ts";
import { selectionText, type Pick } from "./selectionText.ts";
import { referenceNumber } from "./topics.ts";
import { useCopy } from "./useCopy.ts";

interface Props {
  topic: Topic;
  picks: Pick[];
  onPartChange: (ref: string, part: string) => void;
  onRemove: (ref: string) => void;
  onClear: () => void;
}

export function SelectionBar({ topic, picks, onPartChange, onRemove, onClear }: Props) {
  const text = selectionText(topic, picks);
  const [copyState, copy] = useCopy(text);
  const single = picks.length === 1;
  const byId = new Map(topic.references.map((reference) => [reference.id, reference]));

  return (
    <AnimatePresence>
      {picks.length > 0 && (
        <motion.section
          aria-label="선택"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="
            fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[680px] rounded-2xl border border-[var(--line)]
            bg-[var(--surface)] p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)]
            sm:bottom-5 lg:left-[calc(248px+1.25rem)]
          "
        >
          <div className="flex items-baseline justify-between">
            <p className="text-[13.5px] font-semibold">{single ? "하나로 결정" : `조합 ${picks.length}개`}</p>
            <button type="button" onClick={onClear} className="text-[12.5px] text-[var(--muted)] hover:text-[var(--ink)]">
              선택 해제
            </button>
          </div>

          <ul className="mt-3 flex max-h-[36dvh] flex-col gap-2 overflow-y-auto">
            {picks.map((pick) => {
              const reference = byId.get(pick.ref);
              if (!reference) return null;
              return (
                <li key={pick.ref} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] sm:w-[44%]">
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-md bg-[var(--ink)] px-1 text-[11.5px] font-semibold text-[var(--bg)] tabular-nums">
                      {referenceNumber(reference)}
                    </span>
                    <span className="truncate">
                      {reference.product} {reference.title}
                    </span>
                  </span>
                  <span className="flex flex-1 items-center gap-1">
                    <input
                      value={pick.part}
                      onChange={(event) => onPartChange(pick.ref, event.target.value)}
                      placeholder={single ? "마음에 든 점" : "가져올 부분 (비우면 제안받기)"}
                      aria-label={`${referenceNumber(reference)}번에서 ${single ? "마음에 든 점" : "가져올 부분"}`}
                      className="
                        min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5
                        text-[13px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--ink)]
                      "
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(pick.ref)}
                      aria-label={`${referenceNumber(reference)}번 빼기`}
                      className="grid size-7 shrink-0 place-items-center rounded-md text-[16px] text-[var(--muted)] hover:bg-[var(--hover)]"
                    >
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>

          {copyState === "failed" && (
            <textarea
              readOnly
              value={text}
              aria-label="선택 문장"
              onFocus={(event) => event.currentTarget.select()}
              className="mt-3 h-24 w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 font-mono text-[12px]"
            />
          )}

          <button
            type="button"
            onClick={copy}
            className="
              mt-4 w-full rounded-xl bg-[var(--ink)] py-2.5 text-[13.5px] font-semibold text-[var(--bg)]
              transition-opacity hover:opacity-90
            "
          >
            {copyState === "copied"
              ? "복사됨. 대화창에 붙여 넣으세요"
              : copyState === "failed"
                ? "복사하지 못했습니다. 위 문장을 직접 복사하세요"
                : "선택 문장 복사"}
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
