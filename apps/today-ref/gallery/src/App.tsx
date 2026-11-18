import { useSyncExternalStore } from "react";

import type { TopicEntry } from "../../topic.ts";
import { TopicView } from "./TopicView";
import { formatDate, platformLabels, statusLabels, topicEntries } from "./topics.ts";

// 보고 있는 주제는 주소의 #<주제 id>로 둔다. 새로 고침해도 같은 주제가 열린다.
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readHash = () => decodeURIComponent(window.location.hash.slice(1));

export function App() {
  const hash = useSyncExternalStore(subscribeHash, readHash);
  const current = topicEntries.find((entry) => entry.folder === hash) ?? topicEntries[0];

  if (!current) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-[15px] font-semibold">아직 주제가 없습니다</p>
          <p className="mt-1.5 text-[13px] text-[var(--muted)]">대화에서 “오늘의 레퍼런스”라고 말하면 첫 주제를 모아 옵니다.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <TopicNav entries={topicEntries} currentFolder={current.folder} />
      {current.result.ok ? (
        <TopicView key={current.folder} topic={current.result.topic} />
      ) : (
        <BrokenTopic folder={current.folder} errors={current.result.errors} />
      )}
    </div>
  );
}

function TopicNav({ entries, currentFolder }: { entries: TopicEntry[]; currentFolder: string }) {
  return (
    <>
      <header
        className="
          sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--line)]
          bg-[var(--bg)]/85 px-4 backdrop-blur-md lg:hidden
        "
      >
        <span className="shrink-0 text-[14px] font-semibold tracking-[-0.01em]">오늘의레퍼런스</span>
        <select
          aria-label="주제"
          className="
            min-w-0 flex-1 truncate rounded-lg border border-[var(--line)] bg-[var(--surface)]
            px-2.5 py-1.5 text-[13px]
          "
          value={currentFolder}
          onChange={(event) => {
            window.location.hash = event.target.value;
          }}
        >
          {entries.map((entry) => (
            <option key={entry.folder} value={entry.folder}>
              {entry.result.ok ? `${entry.result.topic.date} ${entry.result.topic.title}` : `${entry.folder} (형식 오류)`}
            </option>
          ))}
        </select>
      </header>

      <nav
        className="
          sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-[var(--line)]
          px-3 py-5 lg:flex
        "
      >
        <p className="px-2.5 pb-5 text-[14px] font-semibold tracking-[-0.01em]">오늘의레퍼런스</p>
        <ul className="flex flex-col gap-0.5">
          {entries.map((entry) => {
            const active = entry.folder === currentFolder;
            return (
              <li key={entry.folder}>
                <a
                  href={`#${entry.folder}`}
                  aria-current={active ? "page" : undefined}
                  className={`
                    block rounded-lg px-2.5 py-2 transition-colors
                    ${active ? "bg-[var(--hover)]" : "hover:bg-[var(--hover)]"}
                  `}
                >
                  {entry.result.ok ? (
                    <>
                      <span className="block truncate text-[13.5px] font-medium">{entry.result.topic.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
                        <span>{formatDate(entry.result.topic.date)}</span>
                        <span aria-hidden className="size-0.5 rounded-full bg-current" />
                        <span>{platformLabels[entry.result.topic.platform]}</span>
                        <StatusDot status={entry.result.topic.status} />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block truncate text-[13.5px] font-medium">{entry.folder}</span>
                      <span className="mt-0.5 block text-[12px] text-[var(--danger)]">형식 오류</span>
                    </>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function StatusDot({ status }: { status: keyof typeof statusLabels }) {
  if (status === "selecting") return null;
  return (
    <span className={`ml-auto text-[11.5px] ${status === "done" ? "text-[var(--ink)]" : ""}`}>{statusLabels[status]}</span>
  );
}

function BrokenTopic({ folder, errors }: { folder: string; errors: string[] }) {
  return (
    <main className="px-5 py-10 sm:px-10">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{folder}</h1>
      <p className="mt-2 text-[14px] text-[var(--muted)]">topics/{folder}/topic.json을 읽지 못했습니다.</p>
      <ul className="mt-6 flex flex-col gap-1.5 font-mono text-[12.5px] text-[var(--danger)]">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </main>
  );
}
