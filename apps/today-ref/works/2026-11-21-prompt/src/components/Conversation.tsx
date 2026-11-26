// 요청 말풍선, 이미지 분석 카드, 프롬프트 결과 상자와 변수 패널, 다듬기 제안을 대화 순서대로 그린다.
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { copyText, downloadText } from "../clipboard";
import { fillVariables, findVariables, purposeLabel, refinements, targetLabel, type RefinementId } from "../generate";
import type { RequestTurn, ResultTurn, SentImage, Session } from "../state";
import { PromptText } from "./PromptText";
import { ChevronDownIcon, CopyIcon, DownloadIcon } from "./icons";

// tastepin 모션 기본값: 흐림이 걷히며 0.97배에서 선명해지고, 220ms ease-out-cubic.
const ease = [0.215, 0.61, 0.355, 1] as const;
const enter = {
  initial: { opacity: 0, scale: 0.97, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  transition: { duration: 0.22, ease },
};

interface ConversationProps {
  session: Session;
  onRefine: (refinement: RefinementId, label: string) => void;
  onValue: (resultId: string, name: string, value: string) => void;
  onToast: (message: string) => void;
}

export function Conversation({ session, onRefine, onValue, onToast }: ConversationProps) {
  const lastResultId = [...session.turns].reverse().find((turn) => turn.kind === "result")?.id;
  return (
    <ol className="flex flex-col gap-6">
      {session.turns.map((turn) =>
        turn.kind === "request" ? (
          <RequestBubble key={turn.id} turn={turn} />
        ) : (
          <ResultBlock
            key={turn.id}
            turn={turn}
            latest={turn.id === lastResultId}
            fileName={session.title}
            onRefine={onRefine}
            onValue={(name, value) => onValue(turn.id, name, value)}
            onToast={onToast}
          />
        ),
      )}
    </ol>
  );
}

function RequestBubble({ turn }: { turn: RequestTurn }) {
  return (
    <motion.li {...enter} style={{ transformOrigin: "right top" }} className="flex flex-col items-end gap-2">
      {turn.images.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {turn.images.map((image) => (
            <img key={image.id} src={image.url} alt={image.name} className="size-24 rounded-md border border-[var(--line)] object-cover" />
          ))}
        </div>
      )}
      {turn.text && <p className="request-bubble">{turn.text}</p>}
      <p className="flex flex-wrap justify-end gap-3">
        {turn.purpose && <span className="meta-tag">{purposeLabel(turn.purpose)}</span>}
        <span className="meta-tag">{targetLabel(turn.target)}</span>
      </p>
    </motion.li>
  );
}

interface ResultBlockProps {
  turn: ResultTurn;
  latest: boolean;
  fileName: string;
  onRefine: (refinement: RefinementId, label: string) => void;
  onValue: (name: string, value: string) => void;
  onToast: (message: string) => void;
}

function ResultBlock({ turn, latest, fileName, onRefine, onValue, onToast }: ResultBlockProps) {
  const settled = turn.status === "done" || turn.status === "stopped";
  const visible = settled ? turn.prompt : turn.prompt.slice(0, turn.revealed);
  const variables = settled ? findVariables(turn.prompt) : [];

  async function copy(text: string, message: string) {
    onToast((await copyText(text)) ? message : "복사하지 못했어요. 글을 직접 골라 복사해 주세요.");
  }

  return (
    <li className="flex flex-col gap-4">
      {turn.images.map((image) => (
        <AnalysisCard key={image.id} image={image} onCopy={copy} />
      ))}

      {turn.status === "thinking" ? (
        <p className="thinking" role="status">
          <span className="spinner" aria-hidden="true" />
          {turn.images.length > 0 ? "이미지에서 읽은 색과 구도를 정리하는 중" : "요청을 읽고 프롬프트 구조를 고르는 중"}
        </p>
      ) : (
        <div className="result-row">
          <motion.div {...enter} style={{ transformOrigin: "left top" }} className="result-box" aria-busy={!settled} aria-label="만든 프롬프트">
            <PromptText text={visible} values={turn.values} cursor={turn.status === "writing"} />
            {turn.status === "stopped" && <p className="mt-3 text-[13px] text-[var(--muted)]">여기서 멈췄어요</p>}
          </motion.div>
          {settled && turn.prompt && (
            <div className="result-actions">
              <button type="button" className="icon-button" onClick={() => copy(turn.prompt, "프롬프트를 복사했어요")} aria-label="프롬프트 복사" title="복사">
                <CopyIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => downloadText(`${fileName.replace(/[\\/:*?"<>|…]/g, "").trim() || "프롬프트"}.txt`, turn.prompt)}
                aria-label="텍스트 파일로 내려받기"
                title="내려받기"
              >
                <DownloadIcon />
              </button>
            </div>
          )}
        </div>
      )}

      {variables.length > 0 && <VariablePanel names={variables} prompt={turn.prompt} values={turn.values} onValue={onValue} onCopy={copy} />}

      {latest && settled && turn.prompt && (
        // 제안마다 붙던 반짝이 아이콘과 강조색 알약을 걷고, 보조 버튼 한 줄로 둔다.
        <ul className="flex flex-wrap gap-2" aria-label="다듬기 제안">
          {refinements.map((item) => (
            <li key={item.id}>
              <button type="button" className="btn btn-secondary suggestion" onClick={() => onRefine(item.id, item.label)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function AnalysisCard({ image, onCopy }: { image: SentImage; onCopy: (text: string, message: string) => void }) {
  const { analysis } = image;
  return (
    <motion.section {...enter} style={{ transformOrigin: "left top" }} className="analysis" aria-label={`${image.name} 분석`}>
      <img src={image.url} alt={image.name} className="analysis-image" />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="analysis-card">
          <p>{analysis.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary soft-button" onClick={() => onCopy(analysis.description, "설명을 복사했어요")}>
              설명 복사
            </button>
            <button type="button" className="btn btn-secondary soft-button" onClick={() => onCopy(analysis.swatches.map((swatch) => swatch.hex).join(", "), "색 코드를 복사했어요")}>
              색 코드 복사
            </button>
          </div>
        </div>
        <dl className="analysis-meta">
          <div>
            <dt>주요 색</dt>
            <dd className="flex flex-wrap gap-x-3 gap-y-1.5">
              {analysis.swatches.map((swatch) => (
                <span key={swatch.hex} className="inline-flex items-center gap-1.5">
                  <span className="swatch" style={{ background: swatch.hex }} />
                  {swatch.name}
                  <span className="text-[var(--muted)]">{Math.round(swatch.share * 100)}%</span>
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt>스타일</dt>
            <dd>{analysis.tags.join(", ")}</dd>
          </div>
          <div>
            <dt>비율과 크기</dt>
            <dd>
              {analysis.ratio}, {analysis.width}×{analysis.height}
            </dd>
          </div>
        </dl>
      </div>
    </motion.section>
  );
}

interface VariablePanelProps {
  names: string[];
  prompt: string;
  values: Record<string, string>;
  onValue: (name: string, value: string) => void;
  onCopy: (text: string, message: string) => void;
}

function VariablePanel({ names, prompt, values, onValue, onCopy }: VariablePanelProps) {
  const [open, setOpen] = useState(false);
  const filledCount = names.filter((name) => values[name]?.trim()).length;
  return (
    <section className="variables">
      {/* 장식용 {{ }} 표시와 강조색 체크를 빼고, 개수와 채운 정도만 글자로 둔다. */}
      <button type="button" className="flex min-h-9 w-full items-center gap-2 rounded-[4px] text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="font-semibold">변수 {names.length}개</span>
        <span className="text-[var(--muted)]">{filledCount === names.length ? "모두 채움" : `${filledCount}개 채움`}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[13px] text-[var(--muted)]">
          {open ? "접기" : "채우기"}
          <ChevronDownIcon size={14} className={open ? "rotate-180 transition-transform duration-200" : "transition-transform duration-200"} />
        </span>
      </button>
      {/* tastepin 펼침 영역 예외: 스프링 없이 곡선으로 열고 같은 길로 닫는다. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            // 높이를 여닫는 동안 넘치는 내용을 가린다. 키보드 초점 번짐이 잘리지 않게 사방 4px를 남긴다.
            className="-mx-1 overflow-hidden px-1"
          >
            <div className="flex flex-col gap-3 pb-1 pt-3">
              {names.map((name) => (
                <label key={name} className="flex flex-col gap-1.5">
                  <span className="variable-name">{`{{${name}}}`}</span>
                  <textarea
                    rows={name === "자료" || name.includes("예시") ? 3 : 1}
                    value={values[name] ?? ""}
                    onChange={(event) => onValue(name, event.target.value)}
                    className="field"
                  />
                </label>
              ))}
              <button type="button" className="btn btn-primary self-end" onClick={() => onCopy(fillVariables(prompt, values), "채운 프롬프트를 복사했어요")}>
                채운 프롬프트 복사
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
