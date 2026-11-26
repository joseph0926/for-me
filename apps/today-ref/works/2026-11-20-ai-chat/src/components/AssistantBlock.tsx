// AI 답 하나: 작업 단계, 본문, 답 뒤의 다시 생성과 복사와 출처, 이어서 물어볼 질문.
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { models, tools } from "../answers";
import { type AssistantTurn, progressOf } from "../chat";
import { quick } from "../motion";
import { AnswerText } from "./AnswerText";
import { Icon } from "./Icon";
import { QuestionList } from "./QuestionList";

export function AssistantBlock({
  turn,
  isLatest,
  canAct,
  onCitation,
  onCopy,
  onRegenerate,
  onFollowUp,
}: {
  turn: AssistantTurn;
  isLatest: boolean;
  canAct: boolean;
  onCitation: (sourceId: number | null) => void;
  onCopy: () => void;
  onRegenerate: () => void;
  onFollowUp: (question: string) => void;
}) {
  const { phase, stepsShown, charsShown } = progressOf(turn);
  const { steps, text, sources, followUps } = turn.plan;
  const finished = phase === "done" || phase === "stopped";
  const [stepsOpen, setStepsOpen] = useState(false);
  const showStepRows = !finished || stepsOpen;

  return (
    <article className="px-5" aria-busy={!finished}>
      <p className="mb-2 text-[12px] font-medium text-muted">
        {models[turn.model].name}
        {turn.tool && ` · ${tools[turn.tool].label}`}
      </p>

      {steps.length > 0 && (
        <div className="mb-3">
          {finished && (
            <button
              type="button"
              onClick={() => setStepsOpen((open) => !open)}
              aria-expanded={stepsOpen}
              className="text-btn -ml-2 gap-1 font-normal text-muted"
            >
              작업 {stepsShown}단계
              <Icon name="chevronDown" size={16} className={`transition-transform ${stepsOpen ? "rotate-180" : ""}`} />
            </button>
          )}
          <AnimatePresence initial={false}>
            {showStepRows && (
              <motion.ol
                className="mt-1 space-y-1.5 overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                // 펼침 영역은 스프링 없이 곡선으로 열고 같은 길로 닫는다(tastepin 펼침 영역 예외)
                transition={quick}
              >
                {steps.slice(0, stepsShown).map((step, index) => {
                  const running = !finished && phase === "working" && index === stepsShown - 1;
                  return (
                    <motion.li
                      key={step}
                      className="flex items-center gap-2 text-[13px] text-muted"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span className="grid size-4 place-items-center">
                        {running ? <span className="spinner" /> : <Icon name="check" size={14} className="text-faint" />}
                      </span>
                      {step}
                    </motion.li>
                  );
                })}
              </motion.ol>
            )}
          </AnimatePresence>
        </div>
      )}

      {phase === "waiting" && (
        <p className="animate-pulse text-[15px] text-muted">요청하신 내용을 분석하고 있어요</p>
      )}

      {charsShown > 0 && <AnswerText text={text.slice(0, charsShown)} writing={phase === "writing"} onCitation={onCitation} />}

      {phase === "stopped" && (
        <p className="mt-3 text-[13px] text-muted">{charsShown > 0 ? "답변을 중간에 멈췄어요." : "답변을 시작하기 전에 멈췄어요."}</p>
      )}

      {/* 다시 생성, 출처, 복사는 같은 높이와 모서리의 바탕 없는 버튼 한 벌로 둔다. 출처만 테두리를 두르지 않는다. */}
      {finished && (
        <div className="-ml-2 mt-3 flex items-center gap-1">
          <button type="button" onClick={onRegenerate} disabled={!canAct} className="text-btn text-muted">
            <Icon name="regenerate" size={18} />
            다시 생성
          </button>
          {sources.length > 0 && phase === "done" && (
            <button type="button" onClick={() => onCitation(null)} className="text-btn text-muted">
              <Icon name="sources" size={18} />
              출처 {sources.length}
            </button>
          )}
          {charsShown > 0 && (
            <button type="button" onClick={onCopy} aria-label="답변 복사" className="icon-btn text-muted">
              <Icon name="copy" size={18} />
            </button>
          )}
        </div>
      )}

      {isLatest && phase === "done" && (
        <div className="mt-5">
          <QuestionList label="이어서 물어보기" questions={followUps} disabled={!canAct} onPick={onFollowUp} />
        </div>
      )}
    </article>
  );
}
