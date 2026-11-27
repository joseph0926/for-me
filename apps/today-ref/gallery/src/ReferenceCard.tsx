import { useState } from "react";

import type { Reference, Topic } from "../../topic.ts";
import { captureUrl, evidenceLabels, referenceNumber } from "./topics.ts";

interface Props {
  topic: Topic;
  reference: Reference;
  picked: boolean;
  // 확정한 선택에 들어간 레퍼런스면 가져올 부분(빈 문자열일 수 있다), 아니면 undefined.
  confirmedPart: string | undefined;
  dimmed: boolean;
  onToggle: (() => void) | undefined;
  onOpen: (index: number) => void;
}

export function ReferenceCard({ topic, reference, picked, confirmedPart, dimmed, onToggle, onOpen }: Props) {
  const highlighted = picked || confirmedPart !== undefined;
  const number = referenceNumber(reference);
  const behaviors = reference.behavior ?? [];
  const sawScreen = reference.evidence === "state" || reference.evidence === "still";

  return (
    <article
      className={`
        overflow-hidden rounded-2xl border bg-[var(--surface)]
        transition-[border-color,box-shadow,opacity] duration-200
        ${highlighted ? "border-[var(--ink)] shadow-[0_0_0_1px_var(--ink)]" : "border-[var(--line)]"}
        ${dimmed ? "opacity-45 hover:opacity-100" : ""}
      `}
    >
      <Preview topic={topic} reference={reference} onOpen={onOpen} />

      <div className="p-4">
        <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
          <span
            className={`
              grid h-5 min-w-5 place-items-center rounded-md px-1 text-[11.5px] font-semibold tabular-nums
              ${highlighted ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--hover)] text-[var(--ink)]"}
            `}
          >
            {number}
          </span>
          <span className="font-medium text-[var(--ink)]">{reference.product}</span>
          <span className="truncate">{reference.source}</span>
        </div>

        <h3 className="mt-2.5 text-[15px] leading-[1.4] font-semibold tracking-[-0.01em]">{reference.title}</h3>

        {reference.points.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-[13px] leading-[1.55] text-[var(--muted)]">
            {reference.points.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-[var(--line-strong)]" />
                {point}
              </li>
            ))}
          </ul>
        )}

        {(reference.evidence !== undefined || behaviors.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--muted)]">
            {reference.evidence !== undefined && (
              <span
                className={`
                  rounded-md px-1.5 py-0.5 font-medium
                  ${sawScreen ? "bg-[var(--ink)] text-[var(--bg)]" : "border border-[var(--line)]"}
                `}
              >
                {evidenceLabels[reference.evidence]}
              </span>
            )}
            {behaviors.map((behavior) => (
              <code key={behavior} className="font-mono text-[11.5px]">
                {behavior}
              </code>
            ))}
          </div>
        )}

        {confirmedPart !== undefined && confirmedPart !== "" && (
          <p className="mt-3 rounded-lg bg-[var(--hover)] px-2.5 py-1.5 text-[12.5px]">가져올 부분: {confirmedPart}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <a
            href={reference.url}
            target="_blank"
            rel="noreferrer"
            className="text-[12.5px] text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
          >
            원본 열기 ↗
          </a>
          {onToggle && (
            <button
              type="button"
              aria-pressed={picked}
              onClick={onToggle}
              className={`
                rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors
                ${picked ? "bg-[var(--ink)] text-[var(--bg)]" : "border border-[var(--line)] hover:bg-[var(--hover)]"}
              `}
            >
              {picked ? "선택됨" : "선택"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// 이미지가 늦게 로드되어도 카드가 밀리지 않도록 미리보기 칸의 비율을 고정한다. 전체 화면은 크게 보기에서 본다.
const frameRatio: Record<Topic["platform"], string> = {
  app: "aspect-[4/5]",
  web: "aspect-[16/10]",
};

function Preview({ topic, reference, onOpen }: Pick<Props, "topic" | "reference" | "onOpen">) {
  // 이 사본에 없는 캡처는 건너뛰고 다음 캡처를 보여 준다.
  const [missing, setMissing] = useState<string[]>([]);
  // 칸과 방향이 다른 캡처(웹 주제의 세로 앱 화면 등)는 잘라 내면 윗부분 문구만 남아 전체를 담는다.
  const [contained, setContained] = useState(false);
  const available = reference.captures.filter((name) => !missing.includes(name));
  const first = available[0];

  if (!first) {
    return (
      <a
        href={reference.url}
        target="_blank"
        rel="noreferrer"
        className={`grid ${frameRatio[topic.platform]} place-items-center bg-[var(--hover)] text-[12.5px] text-[var(--muted)]`}
      >
        캡처 없음
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(reference.captures.indexOf(first))}
      className={`group relative block w-full overflow-hidden bg-[var(--hover)] ${frameRatio[topic.platform]}`}
      aria-label={`${reference.product} ${reference.title} 크게 보기`}
    >
      <img
        src={captureUrl(topic, first)}
        alt=""
        loading="lazy"
        onError={() => setMissing((current) => [...current, first])}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          setContained(naturalHeight > naturalWidth !== (topic.platform === "app"));
        }}
        className={`
          block size-full transition-transform duration-500 group-hover:scale-[1.015]
          ${contained ? "object-contain p-3" : "object-cover object-top"}
        `}
      />
      {available.length > 1 && (
        <span className="absolute right-3 bottom-3 rounded-full bg-black/65 px-2 py-0.5 text-[11.5px] font-medium text-white tabular-nums backdrop-blur">
          {available.length}장
        </span>
      )}
    </button>
  );
}
