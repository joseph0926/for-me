// 재생 화면. 영상 하나를 열 때마다 새로 만들어지며(key=영상 id), 닫거나 다른 영상으로 넘어갈 때
// 지금 위치를 onClose와 onSwitch로 넘겨 시청 기록에 남긴다.
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";

import { Icon, type IconName } from "../components/Icon";
import { SceneCanvas } from "../components/SceneCanvas";
import { ROOT_FOLDER_ID, type SubtitleTrack, type Video, folderById, videosIn } from "../data";
import { formatTime } from "../format";
import { Scrubber } from "./Scrubber";
import { SubtitleSheet } from "./SubtitleSheet";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const SEEK_STEP_SEC = 10;
const DOUBLE_TAP_MS = 260;
// tastepin 재생 조작 값: 마지막으로 만진 뒤 2초가 지나면 200ms로 흐려지며 숨는다.
const CONTROLS_HIDE_MS = 2000;
// tastepin 이어보기 시작 값: 저장한 위치에서 바로 재생하고 알림과 처음부터 버튼을 4초 띄운다.
const RESUME_NOTICE_MS = 4000;
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;
const FADE = { duration: 0.2, ease: EASE_OUT_CUBIC };

type Side = "left" | "center" | "right";

export function Player({
  video,
  startAt,
  speed,
  landscape,
  tracks,
  subtitleId,
  hasExternal,
  onSpeedChange,
  onToggleLandscape,
  onSelectSubtitle,
  onLoadExternal,
  onSwitch,
  onClose,
}: {
  video: Video;
  startAt: number;
  speed: number;
  landscape: boolean;
  tracks: SubtitleTrack[];
  subtitleId: string | null;
  hasExternal: boolean;
  onSpeedChange: (speed: number) => void;
  onToggleLandscape: () => void;
  onSelectSubtitle: (trackId: string | null) => void;
  onLoadExternal: () => void;
  onSwitch: (videoId: string, position: number) => void;
  onClose: (position: number) => void;
}) {
  const duration = video.durationSec;
  const [time, setTime] = useState(startAt);
  const [playing, setPlaying] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  // 숨김 타이머를 다시 시작하게 하는 값. 조작할 때마다 올린다.
  const [activity, setActivity] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockHint, setLockHint] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [seekFlash, setSeekFlash] = useState<{ side: "left" | "right"; total: number; key: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [resumeNotice, setResumeNotice] = useState(startAt > 0);
  const pendingTap = useRef<{ side: Side; timer: number } | null>(null);

  const ended = time >= duration;
  const running = playing && !ended && !scrubbing;
  const siblings = videosIn(video.folderId);
  const index = siblings.findIndex((item) => item.id === video.id);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
  const folder = folderById(video.folderId);
  const activeTrack = tracks.find((track) => track.id === subtitleId);

  // 재생 시계. 화면 갱신 주기마다 지난 시간에 속도를 곱해 더한다.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - last) / 1000;
      last = now;
      setTime((current) => Math.min(duration, current + elapsed * speed));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, speed, duration]);

  useEffect(() => {
    if (!controlsVisible || !running || sheetOpen || locked) return;
    const timer = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [controlsVisible, running, sheetOpen, locked, activity]);

  useEffect(() => {
    if (!seekFlash) return;
    const timer = window.setTimeout(() => setSeekFlash(null), 700);
    return () => window.clearTimeout(timer);
  }, [seekFlash]);

  useEffect(() => {
    if (!lockHint) return;
    const timer = window.setTimeout(() => setLockHint(0), 2500);
    return () => window.clearTimeout(timer);
  }, [lockHint]);

  useEffect(() => {
    if (!resumeNotice) return;
    const timer = window.setTimeout(() => setResumeNotice(false), RESUME_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [resumeNotice]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => window.clearTimeout(pendingTap.current?.timer), []);

  const touch = () => setActivity((value) => value + 1);

  const togglePlay = () => {
    touch();
    if (ended) {
      setTime(0);
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  };

  const seekBy = (seconds: number) => {
    setTime((current) => Math.min(duration, Math.max(0, current + seconds)));
    touch();
  };

  const flashSeek = (side: "left" | "right") => {
    seekBy(side === "left" ? -SEEK_STEP_SEC : SEEK_STEP_SEC);
    setSeekFlash((current) => ({
      side,
      total: current && current.side === side ? current.total + SEEK_STEP_SEC : SEEK_STEP_SEC,
      key: Date.now(),
    }));
  };

  // 가운데는 한 번 누르면 바로 조작을 보이거나 숨긴다. 양옆은 두 번 누르면 10초 이동이고,
  // 이동 표시가 떠 있는 동안에는 한 번만 눌러도 10초씩 더 간다.
  const handleTap = (side: Side) => {
    if (locked) {
      setLockHint(Date.now());
      return;
    }
    if (side !== "center" && seekFlash?.side === side) {
      flashSeek(side);
      return;
    }
    const pending = pendingTap.current;
    if (pending) window.clearTimeout(pending.timer);
    if (pending && pending.side === side && side !== "center") {
      pendingTap.current = null;
      flashSeek(side);
      return;
    }
    const timer = window.setTimeout(
      () => {
        pendingTap.current = null;
        setControlsVisible((value) => !value);
        touch();
      },
      side === "center" ? 0 : DOUBLE_TAP_MS,
    );
    pendingTap.current = { side, timer };
  };

  const changeSpeed = (direction: -1 | 1) => {
    const position = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const nextIndex = Math.min(SPEEDS.length - 1, Math.max(0, (position === -1 ? 2 : position) + direction));
    onSpeedChange(SPEEDS[nextIndex]);
    touch();
  };

  // 데스크톱에서 확인할 때 쓰는 키: 스페이스 재생과 일시정지, 좌우 화살표 10초 이동, Esc 닫기
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (sheetOpen) setSheetOpen(false);
      else onClose(time);
      return;
    }
    if (locked || sheetOpen) return;
    if (event.key === " ") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowLeft") {
      flashSeek("left");
    } else if (event.key === "ArrowRight") {
      flashSeek("right");
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const stageStyle: CSSProperties = landscape
    ? {
        position: "absolute",
        top: 0,
        left: "100cqw",
        width: "100cqh",
        height: "100cqw",
        transform: "rotate(90deg)",
        transformOrigin: "top left",
      }
    : { position: "absolute", inset: 0 };

  const cueIndex = Math.floor(time / 6);
  const cue = activeTrack && !ended && time % 6 < 4.2 ? activeTrack.lines[cueIndex % activeTrack.lines.length] : null;
  const showControls = controlsVisible && !locked && !ended;

  return (
    <div className="absolute inset-0 z-30 overflow-hidden bg-black text-white select-none [container-type:size]">
      <div style={stageStyle} className="overflow-hidden">
        <VideoArea landscape={landscape}>
          <SceneCanvas video={video} time={time} width={960} className="absolute inset-0 h-full w-full" />
          <AnimatePresence>
            {seekFlash && (
              <motion.div
                key={seekFlash.side}
                className={`absolute inset-y-0 flex w-[40%] flex-col items-center justify-center gap-1 bg-white/14 ${
                  seekFlash.side === "left" ? "left-0 rounded-r-[100%_50%]" : "right-0 rounded-l-[100%_50%]"
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Icon name={seekFlash.side === "left" ? "rewind" : "forward"} size={26} />
                <span className="tabular text-[13px] font-semibold">{seekFlash.total}초</span>
              </motion.div>
            )}
          </AnimatePresence>
        </VideoArea>

        {/* 화면 터치 영역. 조작 버튼보다 아래에 깔린다. */}
        <div className="absolute inset-0 flex">
          {(["left", "center", "right"] as const).map((side) => (
            <div key={side} className={side === "center" ? "flex-[1.2]" : "flex-1"} onClick={() => handleTap(side)} />
          ))}
        </div>

        <AnimatePresence>
          {showControls && (
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={FADE}
            >
              <div
                className={`absolute inset-0 transition-colors ${scrubbing ? "bg-black/20" : "bg-black/40"}`}
                aria-hidden="true"
              />

              <div className={`absolute inset-x-0 top-0 flex items-start gap-1 px-2 pt-2 transition-opacity ${scrubbing ? "opacity-0" : ""}`}>
                <RoundButton icon="back" label="닫기" onClick={() => onClose(time)} />
                <div className="min-w-0 flex-1 pt-1">
                  {folder && folder.id !== ROOT_FOLDER_ID && (
                    <p className="truncate text-[12px] text-white/70">{folder.name}</p>
                  )}
                  <p className="truncate text-[15px] font-semibold">{video.title}</p>
                </div>
                <RoundButton
                  icon="subtitles"
                  label="자막"
                  active={Boolean(activeTrack)}
                  onClick={() => {
                    setSheetOpen(true);
                    touch();
                  }}
                />
                <RoundButton
                  icon="rotate"
                  label={landscape ? "세로로 보기" : "가로로 보기"}
                  onClick={() => {
                    onToggleLandscape();
                    touch();
                  }}
                />
              </div>

              <div
                className={`absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-7 transition-opacity ${
                  scrubbing ? "opacity-0" : ""
                }`}
              >
                <CenterButton
                  icon="prev"
                  label="이전 영상"
                  disabled={!previous}
                  onClick={() => previous && onSwitch(previous.id, time)}
                />
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={running ? "일시정지" : "재생"}
                  className="pointer-events-auto grid size-14 place-items-center rounded-full bg-white/18 backdrop-blur-sm transition-[scale] duration-[120ms] ease-out active:scale-95"
                >
                  <Icon name={running ? "pause" : "play"} size={26} className={running ? "" : "translate-x-0.5"} />
                </button>
                <CenterButton icon="next" label="다음 영상" disabled={!next} onClick={() => next && onSwitch(next.id, time)} />
              </div>

              <div
                className={`absolute top-1/2 right-2 flex -translate-y-1/2 flex-col items-center gap-1.5 transition-opacity ${
                  scrubbing ? "opacity-0" : ""
                }`}
              >
                <SmallButton icon="plus" label="빠르게" disabled={speed >= SPEEDS[SPEEDS.length - 1]} onClick={() => changeSpeed(1)} />
                <button
                  type="button"
                  onClick={() => {
                    onSpeedChange(1);
                    touch();
                  }}
                  aria-label={`재생 속도 ${formatSpeed(speed)}배, 누르면 1.0배`}
                  className={`tabular pointer-events-auto rounded-md px-1.5 py-1 text-[12px] font-semibold ${speed !== 1 ? "bg-accent text-accent-ink" : "bg-black/40"}`}
                >
                  {formatSpeed(speed)}x
                </button>
                <SmallButton icon="minus" label="느리게" disabled={speed <= SPEEDS[0]} onClick={() => changeSpeed(-1)} />
              </div>

              <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                <div className={`mb-2 flex items-center justify-between transition-opacity ${scrubbing ? "opacity-0" : ""}`}>
                  <span className="tabular text-[13px] font-medium">
                    {formatTime(time)} <span className="text-white/60">/ {formatTime(duration)}</span>
                  </span>
                  <SmallButton
                    icon="lock"
                    label="화면 잠금"
                    onClick={() => {
                      setLocked(true);
                      setLockHint(Date.now());
                    }}
                  />
                </div>
                <Scrubber
                  time={time}
                  duration={duration}
                  scrubbing={scrubbing}
                  landscape={landscape}
                  onScrubStart={(value) => {
                    setScrubbing(true);
                    setTime(value);
                  }}
                  onScrub={setTime}
                  onScrubEnd={(value) => {
                    setScrubbing(false);
                    setTime(value);
                    touch();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 자막과 이어보기 알림은 조작을 띄울 때 어둡게 덮는 층보다 위에 그려 계속 읽히게 한다.
            알림이 영상 아래쪽을 차지하는 동안 자막은 그 위로 올린다. */}
        <VideoArea landscape={landscape}>
          {cue && (
            <p
              className={`absolute inset-x-6 text-center text-[15px] leading-snug font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/90%),0_0_1px_rgb(0_0_0)] ${
                (landscape && showControls) || (resumeNotice && !ended) ? "bottom-[26%]" : "bottom-[7%]"
              }`}
            >
              {cue}
            </p>
          )}
          <AnimatePresence>
            {resumeNotice && !ended && !locked && (
              <motion.div
                className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] items-center gap-3 rounded-md bg-black/70 py-1 pr-1 pl-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE}
              >
                <p className="tabular min-w-0 truncate text-[13px] font-medium">{formatTime(startAt)}부터 이어서 재생해요</p>
                <button
                  type="button"
                  onClick={() => {
                    setTime(0);
                    setPlaying(true);
                    setResumeNotice(false);
                    touch();
                  }}
                  className="btn btn-on-video pointer-events-auto shrink-0"
                  style={{ minHeight: 36, paddingInline: 12 }}
                >
                  처음부터
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </VideoArea>

        <AnimatePresence>
          {locked && lockHint > 0 && (
            <motion.div
              className="absolute inset-x-0 bottom-10 flex justify-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={FADE}
            >
              <button
                type="button"
                onClick={() => {
                  setLocked(false);
                  setLockHint(0);
                  setControlsVisible(true);
                  touch();
                }}
                className="btn btn-on-video bg-black/70"
              >
                <Icon name="unlock" size={18} />
                잠금 해제
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {ended && !locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/65">
            <button type="button" onClick={() => onClose(time)} aria-label="닫기" className="icon-btn absolute top-2 left-2 size-10">
              <Icon name="back" size={22} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label="처음부터 다시 보기"
              className="grid size-14 place-items-center rounded-full bg-white/18 backdrop-blur-sm transition-[scale] duration-[120ms] ease-out active:scale-95"
            >
              <Icon name="replay" size={26} />
            </button>
            {next ? (
              <button type="button" onClick={() => onSwitch(next.id, time)} className="btn btn-accent max-w-[80%]">
                <span className="min-w-0 truncate">다음 영상: {next.title}</span>
              </button>
            ) : (
              <button type="button" onClick={() => onClose(time)} className="btn btn-on-video">
                목록으로
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              className="absolute inset-x-0 top-14 flex justify-center px-6"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={FADE}
            >
              <p className="max-w-full truncate rounded-md bg-raised px-4 py-2 text-[13px] font-medium shadow-lg">{toast.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sheetOpen && (
            <SubtitleSheet
              key="sheet"
              tracks={tracks}
              selectedId={subtitleId}
              hasExternal={hasExternal}
              onSelect={(trackId) => {
                onSelectSubtitle(trackId);
                setSheetOpen(false);
                touch();
              }}
              onLoadExternal={() => {
                onLoadExternal();
                setSheetOpen(false);
                setToast({ text: "외부 자막을 불러왔습니다", key: Date.now() });
              }}
              onClose={() => setSheetOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// 화면 가운데 16:9 영상 자리. 세로 보기에서는 폭에, 가로 보기에서는 높이에 맞춘다.
// 영상 그림과 그 위의 자막이 같은 자리를 쓰도록 두 층에서 함께 쓴다.
function VideoArea({ landscape, children }: { landscape: boolean; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className={`relative aspect-video min-h-0 min-w-0 overflow-hidden ${landscape ? "h-full max-w-full" : "max-h-full w-full"}`}>
        {children}
      </div>
    </div>
  );
}

function RoundButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`icon-btn pointer-events-auto size-10 shrink-0 ${active ? "text-accent" : "text-white"}`}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

function CenterButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="pointer-events-auto grid size-10 place-items-center rounded-full bg-white/12 backdrop-blur-sm transition-[scale] duration-[120ms] ease-out active:scale-95 disabled:opacity-40"
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

function SmallButton({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="icon-btn pointer-events-auto size-9"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

// 1배와 1.5배도 1.0x, 1.5x처럼 소수점을 붙여 폭이 크게 흔들리지 않게 한다.
function formatSpeed(speed: number): string {
  return Number.isInteger(speed) ? speed.toFixed(1) : String(speed);
}
