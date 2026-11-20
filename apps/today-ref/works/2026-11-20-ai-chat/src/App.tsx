// AI 채팅 앱 "곁". 대화와 답변 생성은 chatReducer 하나가 소유하고, 화면은 그 상태를 읽는다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

import { type ModelId, type Tool, models, suggestions } from "./answers";
import { type AssistantTurn, activeTurn, chatReducer, initialChat, progressOf } from "./chat";
import { AssistantBlock } from "./components/AssistantBlock";
import { Composer } from "./components/Composer";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { Icon } from "./components/Icon";
import { Sheet } from "./components/Sheet";
import { SourcesList } from "./components/SourcesList";

type Overlay =
  | { kind: "history" }
  | { kind: "model" }
  | { kind: "sources"; turnId: string; highlightId: number | null }
  | null;

export function App() {
  const [chat, dispatch] = useReducer(chatReducer, initialChat);
  const [model, setModel] = useState<ModelId>("fast");
  const [tool, setTool] = useState<Tool | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);

  const conversation = chat.conversations.find((item) => item.id === chat.currentId);
  const active = activeTurn(chat);
  const generatingId = active ? (chat.conversations.find((item) => item.turns.includes(active))?.id ?? null) : null;
  const hasActive = Boolean(active);
  // 다른 대화에서 답을 쓰는 중이면 이 화면에서는 보내기만 막고, 중지 버튼은 그 답이 보이는 대화에만 둔다.
  const generatingHere = hasActive && generatingId === chat.currentId;
  const busyElsewhere = hasActive && !generatingHere;

  // 답을 쓰는 동안만 시계를 돌린다. 실제로 흐른 시간을 넘겨 화면이 느려져도 글 쓰는 속도가 같다.
  useEffect(() => {
    if (!hasActive) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", dt: now - last });
      last = now;
    }, 50);
    return () => window.clearInterval(timer);
  }, [hasActive]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const send = (text: string) => {
    dispatch({ type: "send", text, tool, model });
    stickRef.current = true;
  };

  const copy = async (turn: AssistantTurn) => {
    const visible = turn.plan.text.slice(0, progressOf(turn).charsShown);
    const plain = visible.replace(/\[([^\]]+)\]\(#\d+\)/g, "$1").replace(/\*\*/g, "").replace(/^## /gm, "");
    try {
      await navigator.clipboard.writeText(plain);
      setToast({ text: "답변을 복사했어요", key: Date.now() });
    } catch {
      setToast({ text: "복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요", key: Date.now() });
    }
  };

  // 맨 아래를 보고 있을 때만 새 글을 따라 내려간다. 위로 올려 읽는 중이면 그대로 두고 ↓ 버튼을 띄운다.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const activeChars = active ? progressOf(active).charsShown + progressOf(active).stepsShown : 0;

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && stickRef.current) element.scrollTop = element.scrollHeight;
  }, [activeChars, chat.currentId, conversation?.turns.length]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    stickRef.current = nearBottom;
    setAwayFromBottom(!nearBottom);
  };

  const scrollToBottom = () => {
    const element = scrollRef.current;
    if (!element) return;
    stickRef.current = true;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  const sourcesTurn =
    overlay?.kind === "sources"
      ? (conversation?.turns.find((turn) => turn.id === overlay.turnId) as AssistantTurn | undefined)
      : undefined;
  const lastAssistant = conversation ? [...conversation.turns].reverse().find((turn) => turn.role === "assistant") : undefined;

  return (
    <div className="relative flex h-full flex-col bg-surface">
      <header className="flex h-14 shrink-0 items-center gap-1 px-2">
        <button type="button" onClick={() => setOverlay({ kind: "history" })} aria-label="지난 대화" className="grid size-10 place-items-center rounded-full">
          <Icon name="menu" size={22} />
        </button>
        <button
          type="button"
          onClick={() => setOverlay({ kind: "model" })}
          className="flex h-10 items-center gap-1 rounded-full px-2 text-[16px] font-semibold"
          aria-label={`모델 바꾸기, 지금 ${models[model].name}`}
        >
          {models[model].name}
          <Icon name="chevronDown" size={16} className="text-muted" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => dispatch({ type: "newChat" })}
          disabled={!conversation}
          aria-label="새 대화"
          className="grid size-10 place-items-center rounded-full disabled:opacity-30"
        >
          <Icon name="compose" size={21} />
        </button>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto">
        {conversation ? (
          <div className="space-y-6 pt-2 pb-6">
            {conversation.turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} className="flex justify-end pl-14 pr-4">
                  <p className="rounded-[20px] rounded-br-md bg-bubble px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">{turn.text}</p>
                </div>
              ) : (
                <AssistantBlock
                  key={turn.id}
                  turn={turn}
                  isLatest={turn === lastAssistant}
                  canAct={!hasActive}
                  onCitation={(highlightId) => setOverlay({ kind: "sources", turnId: turn.id, highlightId })}
                  onCopy={() => copy(turn)}
                  onRegenerate={() => {
                    dispatch({ type: "regenerate", turnId: turn.id, model });
                    stickRef.current = true;
                  }}
                  onFollowUp={send}
                />
              ),
            )}
          </div>
        ) : (
          <EmptyChat disabled={hasActive} onPick={send} />
        )}
      </div>

      <AnimatePresence>
        {conversation && awayFromBottom && (
          <motion.button
            type="button"
            onClick={scrollToBottom}
            aria-label="맨 아래로"
            className="absolute bottom-[132px] left-1/2 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-line bg-surface shadow-md"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Icon name="arrowDown" size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <Composer
        tool={tool}
        generating={generatingHere}
        busyElsewhere={busyElsewhere}
        onToolChange={setTool} onSend={send} onStop={() => dispatch({ type: "stop" })} />

      <AnimatePresence>
        {overlay?.kind === "history" && (
          <HistoryDrawer
            key="history"
            conversations={chat.conversations}
            currentId={chat.currentId}
            generatingId={generatingId}
            onOpen={(id) => {
              dispatch({ type: "open", id });
              stickRef.current = true;
              setOverlay(null);
            }}
            onNewChat={() => {
              dispatch({ type: "newChat" });
              setOverlay(null);
            }}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay?.kind === "model" && (
          <Sheet key="model" title="모델" onClose={() => setOverlay(null)}>
            <ul className="px-1">
              {(Object.keys(models) as ModelId[]).map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      setModel(id);
                      setOverlay(null);
                    }}
                    aria-pressed={model === id}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-raised"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{models[id].name}</span>
                      <span className="block text-[13px] text-muted">{models[id].description}</span>
                    </span>
                    {model === id && <Icon name="check" className="text-accent" />}
                  </button>
                </li>
              ))}
            </ul>
            <p className="px-4 pt-2 text-[12px] text-faint">바꾼 모델은 다음 질문과 다시 생성부터 씁니다.</p>
          </Sheet>
        )}
        {overlay?.kind === "sources" && sourcesTurn && (
          <Sheet key="sources" title={`출처 ${sourcesTurn.plan.sources.length}`} onClose={() => setOverlay(null)}>
            <SourcesList sources={sourcesTurn.plan.sources} highlightId={overlay.highlightId} />
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.key}
            role="status"
            className="absolute top-16 left-1/2 z-50 max-w-[86%] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-center text-[13px] font-medium text-surface"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyChat({ disabled, onPick }: { disabled: boolean; onPick: (question: string) => void }) {
  return (
    <div className="flex min-h-full flex-col px-5 pb-3">
      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <span className="grid size-14 place-items-center rounded-[18px] bg-ink text-[22px] font-bold text-surface" aria-hidden="true">
          곁
        </span>
        <h1 className="mt-4 text-[22px] font-bold tracking-[-0.02em]">무엇을 도와드릴까요?</h1>
        <p className="mt-1 text-[14px] text-muted">궁금한 걸 묻고, 웹 검색을 켜면 출처까지 확인할 수 있어요.</p>
      </div>
      <p className="mb-1.5 text-[12px] font-medium text-muted">이렇게 물어보세요</p>
      <ul className="space-y-2">
        {suggestions.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onPick(question)}
              disabled={disabled}
              className="flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left text-[14px] active:bg-raised disabled:opacity-40"
            >
              <span className="flex-1">{question}</span>
              <Icon name="chevronRight" size={16} className="shrink-0 text-faint" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
