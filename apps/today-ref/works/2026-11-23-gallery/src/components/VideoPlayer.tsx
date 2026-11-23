// 동영상 재생(r5): 아래쪽 반투명 조작 막대, 화면 양옆을 두 번 눌러 10초 이동, 가운데를 두 번 눌러 전체 화면.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";

import { formatDuration } from "../format";
import type { MediaItem } from "../library";
import { BackTenIcon, ExpandIcon, ForwardTenIcon, LoopIcon, PauseIcon, PlayIcon, VolumeIcon } from "./Icons";

const skipSeconds = 10;
const hideAfterMs = 2000;
const doubleClickMs = 240;

type Zone = "back" | "center" | "forward";

export function VideoPlayer({ item }: { item: MediaItem }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const clickTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  const flashTimer = useRef<number | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  // 브라우저에서 녹화한 WebM은 길이 정보가 없어 Infinity가 나온다. 그때는 보관함에 적힌 길이를 쓴다.
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(true);
  const [loop, setLoop] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);
  const [flash, setFlash] = useState<{ zone: Zone; label: string; key: number } | null>(null);
  const duration = mediaDuration ?? item.duration ?? 0;

  useEffect(
    () => () => {
      window.clearTimeout(clickTimer.current);
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const wake = () => {
    setControlsShown(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!video.current?.paused) setControlsShown(false);
    }, hideAfterMs);
  };

  const showFlash = (zone: Zone, label: string) => {
    setFlash({ zone, label, key: Date.now() });
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 650);
  };

  const togglePlay = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      element.play().catch(() => showFlash("center", "재생할 수 없습니다"));
    } else {
      element.pause();
    }
    wake();
  };

  const seekBy = (delta: number) => {
    const element = video.current;
    if (!element) return;
    element.currentTime = Math.min(Math.max(0, element.currentTime + delta), Math.max(0, duration - 0.05));
    setCurrent(element.currentTime);
    showFlash(delta < 0 ? "back" : "forward", delta < 0 ? "10초 뒤로" : "10초 앞으로");
    wake();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else frame.current?.requestFullscreen().catch(() => showFlash("center", "전체 화면을 열 수 없습니다"));
  };

  const zoneOf = (clientX: number): Zone => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return "center";
    const ratio = (clientX - rect.left) / rect.width;
    return ratio < 1 / 3 ? "back" : ratio > 2 / 3 ? "forward" : "center";
  };

  // 한 번 누르기는 재생과 멈춤, 두 번 누르기는 자리에 따라 이동이나 전체 화면. 두 번째 누르기를 기다린 뒤 한 번 누르기로 확정한다.
  const onStageClick = (event: ReactMouseEvent) => {
    if (event.detail >= 2) {
      window.clearTimeout(clickTimer.current);
      const zone = zoneOf(event.clientX);
      if (zone === "back") seekBy(-skipSeconds);
      else if (zone === "forward") seekBy(skipSeconds);
      else toggleFullscreen();
      return;
    }
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(togglePlay, doubleClickMs);
  };

  // 뷰어가 쓰는 방향키와 겹치지 않게 Space와 J, L, M만 받는다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea")) return;
      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "j" || event.key === "J") seekBy(-skipSeconds);
      else if (event.key === "l" || event.key === "L") seekBy(skipSeconds);
      else if (event.key === "m" || event.key === "M") setMuted((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (video.current) {
      video.current.volume = volume;
      video.current.muted = muted;
    }
  }, [volume, muted]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={frame}
      className={`relative grid size-full place-items-center bg-black ${controlsShown ? "" : "cursor-none"}`}
      onPointerMove={wake}
    >
      <video
        ref={video}
        src={item.src}
        poster={item.poster}
        autoPlay
        muted
        playsInline
        loop={loop}
        className="size-full object-contain"
        onClick={onStageClick}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsShown(true);
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value) && value > 0) setMediaDuration(value);
        }}
        onEnded={() => setControlsShown(true)}
      />

      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-black/55 px-4 py-2.5 text-[13px] font-medium text-white ${
              flash.zone === "back" ? "left-[12%]" : flash.zone === "forward" ? "right-[12%]" : "left-1/2 -translate-x-1/2"
            }`}
          >
            {flash.label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ opacity: controlsShown ? 1 : 0, y: controlsShown ? 0 : 6 }}
        transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
        className={`absolute bottom-5 left-1/2 w-[min(560px,calc(100%-24px))] -translate-x-1/2 rounded-md bg-black/55 px-3 pt-2 pb-2.5 text-white backdrop-blur-md ${
          controlsShown ? "" : "pointer-events-none"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button type="button" aria-label={muted ? "소리 켜기" : "소리 끄기"} onClick={() => setMuted((v) => !v)} className="grid size-8 place-items-center rounded-full hover:bg-white/15">
            <VolumeIcon size={18} muted={muted || volume === 0} />
          </button>
          <input
            type="range"
            aria-label="음량"
            className="range w-16"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
            onChange={(event) => {
              setVolume(Number(event.target.value));
              setMuted(Number(event.target.value) === 0);
            }}
          />
          <div className="mx-auto flex items-center gap-1">
            <button type="button" aria-label="10초 뒤로" onClick={() => seekBy(-skipSeconds)} className="grid size-8 place-items-center rounded-full hover:bg-white/15">
              <BackTenIcon size={18} />
            </button>
            <button type="button" aria-label={playing ? "멈춤" : "재생"} onClick={togglePlay} className="grid size-10 place-items-center rounded-full hover:bg-white/15">
              {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>
            <button type="button" aria-label="10초 앞으로" onClick={() => seekBy(skipSeconds)} className="grid size-8 place-items-center rounded-full hover:bg-white/15">
              <ForwardTenIcon size={18} />
            </button>
          </div>
          <button
            type="button"
            aria-label="반복 재생"
            aria-pressed={loop}
            onClick={() => setLoop((v) => !v)}
            className={`grid size-8 place-items-center rounded-full hover:bg-white/15 ${loop ? "text-[#9db8ff]" : ""}`}
          >
            <LoopIcon size={18} />
          </button>
          <button type="button" aria-label="전체 화면" onClick={toggleFullscreen} className="grid size-8 place-items-center rounded-full hover:bg-white/15">
            <ExpandIcon size={17} />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[13px] tabular-nums text-white/80">
          <span>{formatDuration(current)}</span>
          <input
            type="range"
            aria-label="재생 위치"
            className="range flex-1"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(current, duration || 1)}
            style={{ "--fill": `${progress}%` } as CSSProperties}
            onChange={(event) => {
              const element = video.current;
              if (!element) return;
              element.currentTime = Number(event.target.value);
              setCurrent(element.currentTime);
              wake();
            }}
          />
          <span>-{formatDuration(Math.max(0, duration - current))}</span>
        </div>
      </motion.div>
    </div>
  );
}
