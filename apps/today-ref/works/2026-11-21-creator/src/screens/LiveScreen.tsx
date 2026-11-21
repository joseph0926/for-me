import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { CreatorAvatar } from "../components/Avatar";
import { CloseIcon, EyeIcon, HeartIcon, SendIcon } from "../components/Icons";
import { Scene } from "../components/Scene";
import { creatorAccent } from "../components/tone";
import { ME, liveChatPool, liveCreatorLines, liveNow } from "../data";
import { compactCount, elapsedLabel } from "../format";
import { creatorById, fanById } from "../store";

type ChatLine = { id: string; name: string; text: string; fromCreator: boolean; mine: boolean };

const CHAT_INTERVAL_MS = 1_700;
const CHAT_KEEP = 40;
const CHAT_MAX_LENGTH = 100;
// 팬 메시지 네 줄마다 크리에이터가 한 번 채팅에 끼어든다.
const CREATOR_EVERY = 4;
const HEART_COLORS = ["#ff5a7a", "#ffb03a", "#7bd3ff", "#b48cff"];

type FloatingHeart = { id: number; drift: number; color: string };

export function LiveScreen({ creatorId, onClose }: { creatorId: string; onClose: () => void }) {
  const creator = creatorById(creatorId);
  const accent = creatorAccent(creator.hue);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [viewers, setViewers] = useState(liveNow.viewers);
  const [heartTotal, setHeartTotal] = useState(48_210);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now);
  const heartSeq = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  // 서버 대신 정해 둔 채팅을 일정 간격으로 흘린다. 화면을 닫으면 멈춘다.
  useEffect(() => {
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      const fromCreator = tick % (CREATOR_EVERY + 1) === 0;
      const line: ChatLine = fromCreator
        ? {
            id: `live-${tick}`,
            name: creator.name,
            text: liveCreatorLines[(tick / (CREATOR_EVERY + 1) - 1) % liveCreatorLines.length],
            fromCreator: true,
            mine: false,
          }
        : (() => {
            const pick = liveChatPool[tick % liveChatPool.length];
            return { id: `live-${tick}`, name: fanById(pick.fanId).name, text: pick.text, fromCreator: false, mine: false };
          })();
      setLines((previous) => [...previous, line].slice(-CHAT_KEEP));
      setViewers((previous) => previous + Math.round(Math.random() * 18 - 6));
      setHeartTotal((previous) => previous + Math.round(Math.random() * 40));
      setNow(Date.now());
    }, CHAT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [creator.name]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const sendHeart = () => {
    heartSeq.current += 1;
    const heart = {
      id: heartSeq.current,
      drift: Math.round(Math.random() * 40 - 20),
      color: HEART_COLORS[heartSeq.current % HEART_COLORS.length],
    };
    setHearts((previous) => [...previous, heart]);
    setHeartTotal((previous) => previous + 1);
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setLines((previous) => [...previous, { id: crypto.randomUUID(), name: ME.name, text, fromCreator: false, mine: true }].slice(-CHAT_KEEP));
    setDraft("");
  };

  return (
    <motion.div
      className="absolute inset-0 z-40 overflow-hidden bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${creator.name} 라이브`}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Scene motif="stage" hue={creator.hue} className="absolute inset-0" />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.5),transparent_22%,transparent_45%,rgb(0_0_0/0.8))]" />

      <header className="absolute inset-x-3 top-3 flex items-center gap-2">
        <CreatorAvatar creator={creator} size={36} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{creator.name}</p>
          <p className="truncate text-[11.5px] text-white/75">{liveNow.title}</p>
        </div>
        <span className="ml-1 rounded bg-live px-1.5 text-[11px] font-extrabold leading-[18px]">LIVE</span>
        <button type="button" onClick={onClose} aria-label="라이브 닫기" className="ml-auto grid size-10 place-items-center rounded-full bg-black/25">
          <CloseIcon size={20} />
        </button>
      </header>
      <div className="absolute left-3 top-[58px] flex gap-2 text-[11.5px] font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5">
          <EyeIcon size={13} /> {compactCount(viewers)}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5">
          <HeartIcon size={13} filled /> {compactCount(heartTotal)}
        </span>
        <span className="rounded-full bg-black/35 px-2 py-0.5">{elapsedLabel(liveNow.startedAt, now)}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-3 pb-3">
        <p className="self-start rounded-xl px-3 py-2 text-[12.5px] font-semibold leading-snug" style={{ background: accent }}>
          📌 {creator.callName}: 신청곡은 채팅으로! 다음 곡에서 하나 골라 볼게요
        </p>
        <div
          className="no-scrollbar flex h-[34%] max-h-56 min-h-36 flex-col gap-1.5 overflow-y-auto pr-14"
          style={{ maskImage: "linear-gradient(180deg, transparent, #000 30%)" }}
          aria-live="polite"
        >
          {lines.map((line) => (
            <p key={line.id} className="text-[13px] leading-snug [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
              {line.fromCreator && (
                <span className="mr-1 rounded px-1 text-[10px] font-bold leading-4" style={{ background: accent }}>
                  크리에이터
                </span>
              )}
              <span className={`mr-1.5 font-semibold ${line.mine ? "text-amber-200" : "text-white/70"}`}>{line.name}</span>
              {line.text}
            </p>
          ))}
          <div ref={chatEnd} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={CHAT_MAX_LENGTH}
            placeholder="채팅을 입력해 주세요"
            aria-label="라이브 채팅"
            className="h-10 min-w-0 flex-1 rounded-full border border-white/30 bg-black/30 px-4 text-[14px] outline-none placeholder:text-white/55"
          />
          <button
            type="submit"
            disabled={draft.trim() === ""}
            aria-label="채팅 보내기"
            className="grid size-10 place-items-center rounded-full bg-white/15 disabled:opacity-40"
          >
            <SendIcon size={19} />
          </button>
        </form>
      </div>

      <div className="absolute bottom-[68px] right-3 flex flex-col items-center">
        <div className="pointer-events-none relative h-56 w-12">
          <AnimatePresence>
            {hearts.map((heart) => (
              <motion.span
                key={heart.id}
                className="absolute bottom-0 left-1/2 -ml-3"
                style={{ color: heart.color }}
                initial={{ y: 0, x: 0, opacity: 1, scale: 0.6 }}
                animate={{ y: -200, x: heart.drift, opacity: 0, scale: 1.2 }}
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
    </motion.div>
  );
}
