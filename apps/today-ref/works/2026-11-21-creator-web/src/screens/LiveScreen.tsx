import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { CreatorAvatar } from "../components/Avatar";
import { BackIcon, EyeIcon, HeartIcon, SendIcon } from "../components/Icons";
import { Scene } from "../components/Scene";
import { creatorAccent } from "../components/tone";
import { useApp } from "../context";
import { ME, liveChatPool, liveCreatorLines, liveNow } from "../data";
import { compactCount, elapsedLabel } from "../format";
import { creatorById, fanById } from "../store";

type ChatLine = { id: string; name: string; text: string; fromCreator: boolean; mine: boolean };
type FloatingHeart = { id: number; drift: number; color: string };

const CHAT_INTERVAL_MS = 1_700;
const CHAT_KEEP = 60;
const CHAT_MAX_LENGTH = 100;
// 팬 메시지 네 줄마다 크리에이터가 한 번 채팅에 끼어든다.
const CREATOR_EVERY = 4;
const HEART_COLORS = ["#ff5a7a", "#ffb03a", "#7bd3ff", "#b48cff"];

export function LiveScreen({ creatorId }: { creatorId: string }) {
  const { state, dispatch, now, go, back, showToast } = useApp();
  const creator = creatorById(creatorId);
  const accent = creatorAccent(creator.hue);
  const isLive = liveNow.creatorId === creator.id;
  const subscribed = state.subscriptions.includes(creator.id);

  if (!isLive) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-20 text-center">
        <p className="text-[15px] text-muted">{creator.name} 님은 지금 라이브 중이 아니에요</p>
        <button
          type="button"
          onClick={() => go({ name: "creator", creatorId: creator.id, tab: "schedule" })}
          className="mt-4 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface"
        >
          일정 보기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-4 md:px-6 md:pb-8">
      <button type="button" onClick={back} className="-ml-2 mb-2 flex h-10 items-center gap-1 rounded-full pl-1 pr-3 text-[14px] text-muted hover:bg-sunken">
        <BackIcon size={20} /> 뒤로
      </button>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <LivePlayer creatorId={creator.id} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CreatorAvatar creator={creator} size={44} />
            <div className="min-w-[calc(100%-56px)] flex-1 sm:min-w-0">
              <h1 className="text-[19px] font-bold">{liveNow.title}</h1>
              <p className="text-[13px] text-muted">
                {creator.name} · {elapsedLabel(liveNow.startedAt, now)}
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
            {!state.memberships[creator.id] && (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "toggleSubscribe", creatorId: creator.id });
                  showToast(subscribed ? `${creator.name} 구독을 취소했어요` : `${creator.name} 님을 구독했어요`);
                }}
                aria-pressed={subscribed}
                className={`h-10 rounded-full px-5 text-[13.5px] font-semibold ${subscribed ? "bg-sunken text-muted" : "bg-ink text-surface"}`}
              >
                {subscribed ? "구독 중" : "구독하기"}
              </button>
            )}
            <button
              type="button"
              onClick={() => go({ name: "creator", creatorId: creator.id, tab: "home" })}
              className="h-10 rounded-full px-5 text-[13.5px] font-semibold text-white"
              style={{ background: accent }}
            >
              크리에이터 페이지
            </button>
            </div>
          </div>
        </div>
        <LiveChat creatorId={creator.id} />
      </div>
    </div>
  );
}

function LivePlayer({ creatorId }: { creatorId: string }) {
  const creator = creatorById(creatorId);
  const [viewers, setViewers] = useState(liveNow.viewers);
  const [heartTotal, setHeartTotal] = useState(48_210);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const heartSeq = useRef(0);

  // 서버 대신 시청자 수와 하트 수를 조금씩 흔든다. 화면을 떠나면 멈춘다.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setViewers((previous) => previous + Math.round(Math.random() * 18 - 6));
      setHeartTotal((previous) => previous + Math.round(Math.random() * 40));
    }, CHAT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const sendHeart = () => {
    heartSeq.current += 1;
    const heart = { id: heartSeq.current, drift: Math.round(Math.random() * 40 - 20), color: HEART_COLORS[heartSeq.current % HEART_COLORS.length] };
    setHearts((previous) => [...previous, heart]);
    setHeartTotal((previous) => previous + 1);
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black text-white">
      <motion.div className="absolute inset-0" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <Scene motif="stage" hue={creator.hue} className="absolute inset-0" />
      </motion.div>
      <div className="absolute left-3 top-3 flex gap-2 text-[12px] font-semibold">
        <span className="rounded bg-live px-1.5 font-extrabold leading-5">LIVE</span>
        <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 leading-5">
          <EyeIcon size={13} /> {compactCount(viewers)}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 leading-5">
          <HeartIcon size={13} filled /> {compactCount(heartTotal)}
        </span>
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col items-center">
        <div className="pointer-events-none relative h-48 w-12">
          <AnimatePresence>
            {hearts.map((heart) => (
              <motion.span
                key={heart.id}
                className="absolute bottom-0 left-1/2 -ml-3"
                style={{ color: heart.color }}
                initial={{ y: 0, x: 0, opacity: 1, scale: 0.6 }}
                animate={{ y: -170, x: heart.drift, opacity: 0, scale: 1.2 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                onAnimationComplete={() => setHearts((previous) => previous.filter((item) => item.id !== heart.id))}
              >
                <HeartIcon size={24} filled />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.82 }}
          onClick={sendHeart}
          aria-label="하트 보내기"
          className="grid size-12 place-items-center rounded-full bg-white/20 text-[#ff5a7a] backdrop-blur"
        >
          <HeartIcon size={26} filled />
        </motion.button>
      </div>
    </div>
  );
}

function LiveChat({ creatorId }: { creatorId: string }) {
  const creator = creatorById(creatorId);
  const accent = creatorAccent(creator.hue);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // 정해 둔 채팅을 일정 간격으로 흘린다. 화면을 떠나면 멈춘다.
  useEffect(() => {
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      const fromCreator = tick % (CREATOR_EVERY + 1) === 0;
      let line: ChatLine;
      if (fromCreator) {
        const text = liveCreatorLines[(tick / (CREATOR_EVERY + 1) - 1) % liveCreatorLines.length];
        line = { id: `live-${tick}`, name: creator.name, text, fromCreator: true, mine: false };
      } else {
        const pick = liveChatPool[tick % liveChatPool.length];
        line = { id: `live-${tick}`, name: fanById(pick.fanId).name, text: pick.text, fromCreator: false, mine: false };
      }
      setLines((previous) => [...previous, line].slice(-CHAT_KEEP));
    }, CHAT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [creator.name]);

  // 채팅 목록 상자 안에서만 끝으로 내린다. 페이지 전체가 따라 스크롤되지 않게 한다.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lines]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setLines((previous) => [...previous, { id: crypto.randomUUID(), name: ME.name, text, fromCreator: false, mine: true }].slice(-CHAT_KEEP));
    setDraft("");
  };

  return (
    <section className="flex h-[420px] flex-col overflow-hidden rounded-2xl border border-line lg:h-[min(640px,calc(100dvh-120px))]" aria-label="라이브 채팅">
      <h2 className="border-b border-line px-4 py-3 text-[14px] font-bold">실시간 채팅</h2>
      <p className="mx-3 mt-3 rounded-xl px-3 py-2 text-[12.5px] font-semibold leading-snug text-white" style={{ background: accent }}>
        📌 {creator.callName}: 신청곡은 채팅으로! 다음 곡에서 하나 골라 볼게요
      </p>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <li key={line.id} className="text-[13.5px] leading-snug">
              {line.fromCreator && (
                <span className="mr-1 rounded px-1 text-[10.5px] font-bold leading-4 text-white" style={{ background: accent }}>
                  크리에이터
                </span>
              )}
              <span className={`mr-1.5 font-semibold ${line.mine ? "" : "text-muted"}`} style={line.mine ? { color: accent } : undefined}>
                {line.name}
              </span>
              {line.text}
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="채팅을 입력해 주세요"
          aria-label="라이브 채팅 입력"
          className="h-10 min-w-0 flex-1 rounded-full bg-sunken px-4 text-[14px] outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={draft.trim() === ""}
          aria-label="채팅 보내기"
          className="grid size-10 place-items-center rounded-full text-white disabled:opacity-35"
          style={{ background: accent }}
        >
          <SendIcon size={18} />
        </button>
      </form>
    </section>
  );
}
