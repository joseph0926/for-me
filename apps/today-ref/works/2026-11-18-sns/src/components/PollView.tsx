import { motion } from "motion/react";

import type { Poll } from "../data";
import { formatCount, toPercents } from "../format";

const barTransition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] } as const;

export function PollView({ poll, onVote }: { poll: Poll; onVote: (optionId: string) => void }) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const percents = toPercents(poll.options.map((option) => option.votes));
  const hasVoted = poll.votedOptionId !== null;

  return (
    <div className="mt-2.5" onClick={(event) => event.stopPropagation()}>
      <ul className="space-y-2">
        {poll.options.map((option, index) => (
          <li key={option.id}>
            {hasVoted ? (
              <ResultBar label={option.label} percent={percents[index]} isMine={option.id === poll.votedOptionId} />
            ) : (
              <button
                type="button"
                onClick={() => onVote(option.id)}
                className="flex h-11 w-full items-center rounded-[12px] border border-line-strong px-4 text-left text-[15px] font-medium transition-colors active:bg-fill"
              >
                {option.label}
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[13px] text-muted">
        {formatCount(totalVotes)}표, {poll.remaining}
      </p>
    </div>
  );
}

// 막대가 글자 위를 지나도 읽히도록 같은 줄을 두 번 그리고, 위 줄을 비율만큼만 잘라 보여 준다.
function ResultBar({ label, percent, isMine }: { label: string; percent: number; isMine: boolean }) {
  const row = (
    <>
      <span className="truncate">{label}</span>
      <span className="ml-auto pl-3 tabular-nums">{percent}%</span>
    </>
  );

  return (
    <div
      className="relative h-11 overflow-hidden rounded-[12px] bg-fill text-[15px] font-medium"
      aria-label={`${label} ${percent}%${isMine ? ", 내가 고른 항목" : ""}`}
    >
      <div className={`flex h-full items-center px-4 ${isMine ? "text-ink" : "text-soft"}`}>{row}</div>
      <motion.div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center px-4 ${isMine ? "bg-ink text-surface" : "bg-fill-strong text-soft"}`}
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        transition={barTransition}
      >
        {row}
      </motion.div>
    </div>
  );
}
