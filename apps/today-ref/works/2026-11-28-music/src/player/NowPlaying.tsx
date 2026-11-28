// 재생 화면: 커버 색이 화면 전체 배경으로 번지고, 커버 아래 가사 두 줄, 제목 줄, 재생바와 조작, 맨 아래 가사와 대기열 전환.
// 미니 플레이어에서 아래로부터 올라오고, 위쪽을 잡아 내리거나 접기 버튼으로 닫는다.
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";

import { CoverArtwork } from "../components/Cover";
import { Icon } from "../components/Icon";
import { albumOf, getTrack } from "../data";
import { currentTrackId } from "../music";
import { quick, sheet, toneChange } from "../motion";
import { useMusic } from "../MusicProvider";
import { useUi } from "../ui";
import { currentLine } from "./lyrics";
import { LyricsView } from "./LyricsView";
import { QueueView } from "./QueueView";
import { Controls, Seekbar } from "./Transport";

type Mode = "cover" | "lyrics" | "queue";

// 이만큼 끌어내리거나 빠르게 내리면 닫는다.
const closeDistance = 120;
const closeVelocity = 600;

export function NowPlaying({ onClose, inert }: { onClose: () => void; inert: boolean }) {
  const { state, dispatch } = useMusic();
  const ui = useUi();
  const [mode, setMode] = useState<Mode>("cover");
  const drag = useDragControls();
  const trackId = currentTrackId(state);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !inert) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, inert]);

  if (!trackId) return null;
  const track = getTrack(trackId);
  const album = albumOf(trackId);
  const liked = state.liked.includes(trackId);

  const palette = {
    "--player-tone": album.tone,
    "--player-ink": "#f5f5f6",
    "--player-dim": "rgb(245 245 246 / 0.66)",
    "--player-accent": "#ffab7a",
    "--seek-done": "#f5f5f6",
    "--seek-rest": "rgb(245 245 246 / 0.24)",
  } as CSSProperties;

  function startDrag(event: PointerEvent) {
    drag.start(event);
  }

  function endDrag(_: unknown, info: PanInfo) {
    if (info.offset.y > closeDistance || info.velocity.y > closeVelocity) onClose();
  }

  const likeButton = (
    <button
      type="button"
      onClick={() => dispatch({ type: "like", trackId })}
      aria-pressed={liked}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
      className="grid size-10 place-items-center rounded-work hover:bg-white/10"
    >
      <Icon name={liked ? "heartFilled" : "heart"} className={liked ? "text-[var(--player-accent)]" : ""} />
    </button>
  );

  return (
    <motion.section
      role="dialog"
      aria-label="재생 중인 곡"
      inert={inert}
      initial={{ y: "100%" }}
      animate={{ y: 0, backgroundColor: album.tone }}
      exit={{ y: "100%" }}
      transition={{ ...sheet, backgroundColor: toneChange }}
      drag="y"
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      onDragEnd={endDrag}
      style={palette}
      // 넓은 화면의 휴대폰 틀에서는 상태 표시줄과 제스처 막대 뒤까지 넓혀 커버 색이 화면 전체에 깔리게 한다(값은 PhoneFrame.css).
      data-frame-tone="dark"
      className="absolute inset-x-0 top-[calc(var(--frame-top,0px)*-1)] bottom-[calc(var(--frame-bottom,0px)*-1)] z-30 flex flex-col overflow-hidden pt-[var(--frame-top,0px)] pb-[var(--frame-bottom,0px)] text-[var(--player-ink)]"
    >
      {/* 커버의 바탕색이 위쪽에서 번지는 빛. 곡이 바뀌면 겹쳐 바뀐다. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={album.id}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={toneChange}
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(130% 62% at 50% 8%, ${album.cover.ground}66, transparent 72%)` }}
        />
      </AnimatePresence>

      <header onPointerDown={startDrag} className="relative flex h-14 shrink-0 touch-none items-center px-3">
        <button type="button" onClick={onClose} aria-label="재생 화면 닫기" className="grid size-10 place-items-center rounded-work hover:bg-white/10">
          <Icon name="down" />
        </button>
        <span aria-hidden="true" className="absolute top-2 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/35" />
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {mode === "cover" ? (
          <div className="flex min-h-0 flex-1 flex-col px-7">
            <div onPointerDown={startDrag} className="flex min-h-0 flex-1 touch-none items-center justify-center">
              <motion.div
                animate={{ scale: state.playing ? 1 : 0.88 }}
                transition={sheet}
                className="aspect-square max-h-full w-full max-w-[320px] overflow-hidden rounded-work shadow-[0_18px_40px_rgb(0_0_0/0.4)]"
              >
                <CoverArtwork art={album.cover} className="size-full" />
              </motion.div>
            </div>
            <LyricPreview trackId={trackId} position={state.position} onOpen={() => setMode("lyrics")} />
            <div className="mt-3 flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <h2 className="title truncate text-2xl">{track.title}</h2>
                <p className="truncate text-[15px] text-[var(--player-dim)]">{album.artist}</p>
              </div>
              {likeButton}
              <button
                type="button"
                onClick={() => ui.openActions(trackId)}
                aria-label={`${track.title} 더보기`}
                className="grid size-10 place-items-center rounded-work hover:bg-white/10"
              >
                <Icon name="more" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-3 px-5 pb-2">
              <CoverArtwork art={album.cover} className="size-12 shrink-0 rounded-work" />
              <div className="min-w-0 flex-1">
                <p className="title truncate text-[17px]">{track.title}</p>
                <p className="truncate text-[13px] text-[var(--player-dim)]">{album.artist}</p>
              </div>
              {likeButton}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={quick}
                className="min-h-0 flex-1"
              >
                {mode === "lyrics" ? <LyricsView /> : <QueueView />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="shrink-0 px-7 pt-3">
          <Seekbar />
          <div className="mt-1">
            <Controls />
          </div>
        </div>

        <nav aria-label="재생 화면 보기" className="flex shrink-0 justify-between px-8 pt-2 pb-5">
          <ModeButton mode="lyrics" current={mode} onChange={setMode} label="가사" icon="lyrics" />
          <ModeButton mode="queue" current={mode} onChange={setMode} label="대기열" icon="queue" />
        </nav>
      </div>
    </motion.section>
  );
}

function ModeButton({
  mode,
  current,
  onChange,
  label,
  icon,
}: {
  mode: Mode;
  current: Mode;
  onChange: (mode: Mode) => void;
  label: string;
  icon: "lyrics" | "queue";
}) {
  const active = mode === current;
  return (
    <button
      type="button"
      onClick={() => onChange(active ? "cover" : mode)}
      aria-pressed={active}
      aria-label={label}
      className={`grid size-10 place-items-center rounded-work transition-colors ${
        active ? "text-[var(--player-accent)]" : "text-[var(--player-dim)] hover:text-[var(--player-ink)]"
      }`}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

// 커버 아래 가사 두 줄. 지금 줄만 강조색이고, 누르면 가사 화면으로 간다.
function LyricPreview({ trackId, position, onOpen }: { trackId: string; position: number; onOpen: () => void }) {
  const lyrics = getTrack(trackId).lyrics;
  if (!lyrics) return <div className="mt-4 h-12" aria-hidden="true" />;
  const active = currentLine(lyrics, position);
  const shown = active < 0 ? [lyrics[0]] : lyrics.slice(active, active + 2);

  return (
    <button type="button" onClick={onOpen} aria-label="가사 보기" className="mt-4 block h-12 w-full overflow-hidden text-center text-[15px] leading-6">
      {shown.map((line, index) => (
        <span
          key={line.at}
          className={`block truncate ${index === 0 && active >= 0 ? "font-medium text-[var(--player-accent)]" : "text-[var(--player-dim)]"}`}
        >
          {line.text}
        </span>
      ))}
    </button>
  );
}
