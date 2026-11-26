// 말틀: 채팅이나 이미지와 채팅을 받아 프롬프트를 만들어 주는 웹. 서버 없이 메모리에만 기록한다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

import { Composer } from "./components/Composer";
import { Conversation } from "./components/Conversation";
import { HistoryView } from "./components/HistoryView";
import { BugIcon, ImageIcon, InboxIcon, MegaphoneIcon, NotesIcon, PlusIcon } from "./components/icons";
import { examples, seedSessions, type Example } from "./samples";
import { activeSession, isBusy, latestResult, reducer, type Action, type Session, type State } from "./state";
import { useDraft } from "./useDraft";

const TICK_MS = 30;

function initialState(now: number): State {
  return { sessions: seedSessions(now), activeId: null, view: "make" };
}

export function App() {
  const [now] = useState(() => Date.now());
  const [state, dispatch] = useReducer(reducer, now, initialState);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const busy = isBusy(state);
  const session = activeSession(state);

  // 결과를 쓰는 동안에만 타이머를 돌린다.
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string) => setToast({ id: Date.now(), message });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="app-header">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-3 px-4 sm:px-6">
          <button type="button" className="flex items-center gap-2" onClick={() => dispatch({ type: "newSession" })} aria-label="말틀 처음 화면">
            <Logo />
            <span className="text-[17px] font-bold tracking-[-0.02em]">말틀</span>
          </button>
          <nav className="tabs mx-auto" aria-label="화면">
            <button type="button" className="tab" aria-current={state.view === "make" ? "page" : undefined} onClick={() => dispatch({ type: "setView", view: "make" })}>
              만들기
            </button>
            <button type="button" className="tab" aria-current={state.view === "history" ? "page" : undefined} onClick={() => dispatch({ type: "setView", view: "history" })}>
              기록 <span className="tab-count">{state.sessions.length}</span>
            </button>
          </nav>
          <button type="button" className="btn btn-secondary new-button" onClick={() => dispatch({ type: "newSession" })} disabled={busy} aria-label="새 프롬프트">
            <PlusIcon size={16} strokeWidth={2.2} />
            <span className="hidden sm:inline">새 프롬프트</span>
          </button>
        </div>
      </header>

      {state.view === "history" ? (
        <HistoryView sessions={state.sessions} activeId={state.activeId} busy={busy} now={now} onOpen={(id) => dispatch({ type: "open", sessionId: id })} />
      ) : (
        <MakeView key={session?.id ?? "new"} session={session} busy={busy} dispatch={dispatch} onToast={showToast} />
      )}

      <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-4" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
              className="toast"
            >
              {toast.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface MakeViewProps {
  session: Session | null;
  busy: boolean;
  dispatch: (action: Action) => void;
  onToast: (message: string) => void;
}

function MakeView({ session, busy, dispatch, onToast }: MakeViewProps) {
  const draft = useDraft({ target: session?.target ?? "chat", purpose: session?.purpose ?? null });
  const result = latestResult(session);
  const progress = `${session?.turns.length ?? 0}:${result?.revealed ?? 0}:${result?.status ?? ""}`;

  // 새 요청을 보내거나 결과가 쓰이는 동안 문서 맨 아래를 따라간다. 사용자가 위로 올려 읽는 중이면 따라가지 않는다.
  // 아래에 붙은 입력창까지 문서 높이에 들어가므로, 기준점 요소가 아니라 문서 끝으로 스크롤해야 판정과 맞는다.
  const following = useRef(true);
  useEffect(() => {
    function track() {
      following.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    }
    window.addEventListener("scroll", track, { passive: true });
    return () => window.removeEventListener("scroll", track);
  }, []);
  useLayoutEffect(() => {
    if (following.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [progress]);

  function submit() {
    const submission = draft.takeSubmission();
    if (!submission) return;
    following.current = true;
    dispatch({ type: "submit", submission, now: Date.now() });
  }

  function applyExample(example: Example) {
    draft.setText(example.text);
    draft.setTarget(example.target);
    draft.setPurpose(example.purpose);
    if (example.sample) draft.addSample(example.sample.url, example.sample.name);
    // 예시를 고른 뒤 바로 고쳐 쓰거나 Enter로 보낼 수 있게 입력칸으로 초점을 옮긴다.
    document.getElementById("composer-text")?.focus();
  }

  const composer = <Composer draft={draft} busy={busy} following={result !== null} onSubmit={submit} onStop={() => dispatch({ type: "stop" })} />;

  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
        <h1 className="text-center text-[26px] font-bold tracking-[-0.02em] sm:text-[30px]">어떤 프롬프트가 필요하세요?</h1>
        <ul className="mx-auto mb-5 mt-6 flex max-w-[620px] flex-wrap justify-center gap-2" aria-label="예시">
          {examples.map((example) => (
            <li key={example.id}>
              <button type="button" className="btn btn-secondary example" onClick={() => applyExample(example)}>
                <ExampleIcon icon={example.icon} />
                {example.label}
              </button>
            </li>
          ))}
        </ul>
        {composer}
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-6 pt-8 sm:px-6">
        <Conversation
          session={session}
          onRefine={(refinement, label) => {
            following.current = true;
            dispatch({ type: "refine", refinement, label });
          }}
          onValue={(resultId, name, value) => dispatch({ type: "setValue", resultId, name, value })}
          onToast={onToast}
        />
      </main>
      <div className="composer-dock">
        <div className="mx-auto w-full max-w-[760px] px-4 sm:px-6">{composer}</div>
      </div>
    </>
  );
}

function ExampleIcon({ icon }: { icon: Example["icon"] }) {
  const props = { size: 16 };
  if (icon === "notes") return <NotesIcon {...props} />;
  if (icon === "megaphone") return <MegaphoneIcon {...props} />;
  if (icon === "image") return <ImageIcon {...props} />;
  if (icon === "inbox") return <InboxIcon {...props} />;
  return <BugIcon {...props} />;
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" rx="8" fill="var(--accent)" />
      <path d="M9 7.5H7v11h2M17 7.5h2v11h-2" stroke="var(--on-accent)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 13h4" stroke="var(--on-accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
