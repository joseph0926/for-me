import { useState } from "react";

import { referenceKinds, type ReferenceKind, type Topic } from "../../topic.ts";
import { Lightbox } from "./Lightbox";
import { ReferenceCard } from "./ReferenceCard";
import { SelectionBar } from "./SelectionBar";
import type { Pick } from "./selectionText.ts";
import { formatDate, platformLabels, referenceNumber, runCommand, statusLabels } from "./topics.ts";
import { useCopy } from "./useCopy.ts";

const kindLabels: Record<ReferenceKind, string> = {
  product: "실제 제품",
  gallery: "레퍼런스 사이트",
};

export function TopicView({ topic }: { topic: Topic }) {
  // 고르는 순서가 조합 문장의 순서가 된다.
  const [picks, setPicks] = useState<Pick[]>(() => loadPicks(topic));
  const [viewing, setViewing] = useState<{ ref: string; index: number } | null>(null);

  const canPick = topic.status === "selecting";
  const confirmedParts = new Map(topic.selection?.items.map((item) => [item.ref, item.part]) ?? []);
  const viewingReference = viewing && topic.references.find((reference) => reference.id === viewing.ref);

  const updatePicks = (next: Pick[]) => {
    setPicks(next);
    savePicks(topic, next);
  };
  const toggle = (ref: string) =>
    updatePicks(
      picks.some((pick) => pick.ref === ref) ? picks.filter((pick) => pick.ref !== ref) : [...picks, { ref, part: "" }],
    );
  const setPart = (ref: string, part: string) =>
    updatePicks(picks.map((pick) => (pick.ref === ref ? { ...pick, part } : pick)));

  const groups = referenceKinds
    .map((kind) => ({ kind, references: topic.references.filter((reference) => reference.kind === kind) }))
    .filter((group) => group.references.length > 0);

  return (
    <main className={`min-w-0 px-4 pt-8 sm:px-8 lg:px-12 lg:pt-12 ${picks.length > 0 ? "pb-80" : "pb-16"}`}>
      <header className="max-w-[760px]">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--muted)]">
          <span>{formatDate(topic.date)}</span>
          <Tag>{platformLabels[topic.platform]}</Tag>
          <Tag strong={topic.status !== "selecting"}>{statusLabels[topic.status]}</Tag>
        </div>
        <h1 className="mt-3 text-[30px] leading-[1.15] font-semibold tracking-[-0.025em] sm:text-[36px]">{topic.title}</h1>
        {topic.brief !== "" && <p className="mt-3 text-[15px] leading-[1.6] text-[var(--muted)]">{topic.brief}</p>}
        {topic.selection && <Decision topic={topic} />}
      </header>

      {groups.map((group) => (
        <section key={group.kind} className="mt-12" aria-labelledby={`kind-${group.kind}`}>
          <h2 id={`kind-${group.kind}`} className="flex items-baseline gap-2 text-[13px] font-semibold">
            {kindLabels[group.kind]}
            <span className="font-normal text-[var(--muted)] tabular-nums">{group.references.length}</span>
          </h2>
          <div className="mt-4 grid items-start gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {group.references.map((reference) => (
              <ReferenceCard
                key={reference.id}
                topic={topic}
                reference={reference}
                picked={picks.some((pick) => pick.ref === reference.id)}
                confirmedPart={confirmedParts.get(reference.id)}
                dimmed={topic.selection !== null && !confirmedParts.has(reference.id)}
                onToggle={canPick ? () => toggle(reference.id) : undefined}
                onOpen={(index) => setViewing({ ref: reference.id, index })}
              />
            ))}
          </div>
        </section>
      ))}

      {canPick && (
        <SelectionBar
          topic={topic}
          picks={picks}
          onPartChange={setPart}
          onRemove={toggle}
          onClear={() => updatePicks([])}
        />
      )}

      {viewingReference && (
        <Lightbox
          topic={topic}
          reference={viewingReference}
          index={viewing.index}
          onIndexChange={(index) => setViewing({ ref: viewingReference.id, index })}
          onClose={() => setViewing(null)}
        />
      )}
    </main>
  );
}

// 다른 주제 파일이 저장되면 갤러리가 새로 고쳐진다. 고르던 내용은 이 탭에만 잠시 보관해 잃지 않게 한다.
const picksKey = (topic: Topic) => `today-ref:picks:${topic.id}`;

function loadPicks(topic: Topic): Pick[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(picksKey(topic)) ?? "[]");
    if (!Array.isArray(saved)) return [];
    const ids = new Set(topic.references.map((reference) => reference.id));
    return saved.filter(
      (pick): pick is Pick =>
        typeof pick?.ref === "string" && typeof pick?.part === "string" && ids.has(pick.ref),
    );
  } catch {
    return [];
  }
}

function savePicks(topic: Topic, picks: Pick[]) {
  try {
    if (picks.length === 0) sessionStorage.removeItem(picksKey(topic));
    else sessionStorage.setItem(picksKey(topic), JSON.stringify(picks));
  } catch {
    // 저장소를 쓸 수 없는 탭에서는 새로 고칠 때 선택이 사라질 뿐 고르는 동작은 그대로다.
  }
}

function Tag({ children, strong = false }: { children: string; strong?: boolean }) {
  return (
    <span
      className={`
        rounded-full border px-2 py-0.5 text-[11.5px] font-medium
        ${strong ? "border-transparent bg-[var(--ink)] text-[var(--bg)]" : "border-[var(--line)]"}
      `}
    >
      {children}
    </span>
  );
}

function Decision({ topic }: { topic: Topic }) {
  const command = runCommand(topic);
  const [copyState, copy] = useCopy(command);
  const selection = topic.selection;
  if (!selection) return null;

  const byId = new Map(topic.references.map((reference) => [reference.id, reference]));
  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-[12.5px] font-semibold">{selection.mode === "single" ? "하나로 결정" : "조합"}</p>
      <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">
        {selection.items.map((item) => {
          const reference = byId.get(item.ref);
          if (!reference) return null;
          return (
            <li key={item.ref} className="flex gap-2">
              <span className="w-5 shrink-0 text-right text-[var(--muted)] tabular-nums">{referenceNumber(reference)}</span>
              <span>
                {reference.product} {reference.title}
                {item.part !== "" && <span className="text-[var(--muted)]">: {item.part}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] text-[var(--muted)]"><code>apps/today-ref</code>에서 실행</p>
      <div className="mt-1 flex items-center gap-2 rounded-lg bg-[var(--hover)] py-1.5 pr-1.5 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{command}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md px-2 py-1 text-[12px] font-medium hover:bg-[var(--surface)]"
        >
          {copyState === "copied" ? "복사됨" : copyState === "failed" ? "복사 실패" : "복사"}
        </button>
      </div>
    </div>
  );
}
