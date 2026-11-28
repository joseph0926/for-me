// 대기열: 지금 곡을 강조색으로 두고, 다음 곡 행마다 끌기 손잡이. 머리말의 지우기와 맨 아래 셔플, 반복 칸.
import { Reorder, useDragControls } from "motion/react";
import type { KeyboardEvent } from "react";

import { TrackCover } from "../components/Cover";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { albumOf, getTrack } from "../data";
import { shuffled, type QueueItem } from "../music";
import { quick } from "../motion";
import { useMusic } from "../MusicProvider";

// 끄는 행의 바탕: 곡의 바탕색보다 한 단계 밝은 면. 크기와 그림자는 그대로 둔다.
function lifted(tone: string): string {
  const channels = [1, 3, 5].map((at) => parseInt(tone.slice(at, at + 2), 16));
  const mixed = channels.map((value) => Math.round(value + (255 - value) * 0.1));
  return `rgb(${mixed.join(" ")})`;
}

// 평소에는 시트 그라데이션이 비치게 두고, 끄는 동안에만 곡의 바탕색을 깔아 아래 행과 겹쳐 보이지 않게 한다.
function UpcomingRow({
  item,
  tone,
  onPlay,
  onMove,
}: {
  item: QueueItem;
  tone: string;
  onPlay: () => void;
  onMove: (step: -1 | 1) => void;
}) {
  const controls = useDragControls();
  const track = getTrack(item.trackId);
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="relative flex items-center gap-1 pl-5"
      style={{ backgroundColor: "rgb(0 0 0 / 0)" }}
      transition={quick}
      whileDrag={{ backgroundColor: lifted(tone), transition: { duration: 0.15 } }}
    >
      <button type="button" onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <TrackCover trackId={item.trackId} className="size-10 shrink-0 rounded-work" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{track.title}</span>
          <span className="block truncate text-sm text-[var(--player-dim)]">{albumOf(item.trackId).artist}</span>
        </span>
      </button>
      <button
        type="button"
        onPointerDown={(event) => controls.start(event)}
        onKeyDown={(event: KeyboardEvent) => {
          // 손잡이에 초점을 두고 위아래 화살표로도 옮긴다.
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          onMove(event.key === "ArrowUp" ? -1 : 1);
        }}
        aria-label={`${track.title} 순서 바꾸기, 위아래 화살표로 옮기기`}
        className="grid size-11 shrink-0 touch-none cursor-grab place-items-center text-[var(--player-dim)] active:cursor-grabbing"
      >
        <Icon name="grip" size={20} />
      </button>
    </Reorder.Item>
  );
}

export function QueueView() {
  const { state, dispatch } = useMusic();
  const now = state.queue[state.index];
  const upcoming = state.queue.slice(state.index + 1);
  const tone = now ? albumOf(now.trackId).tone : "#000000";

  function moveUpcoming(from: number, step: -1 | 1) {
    const to = from + step;
    if (to < 0 || to >= upcoming.length) return;
    const next = [...upcoming];
    [next[from], next[to]] = [next[to], next[from]];
    dispatch({ type: "reorder", upcoming: next });
  }

  function toggleShuffle() {
    dispatch({ type: "shuffle", upcomingKeys: shuffled(upcoming.map((item) => item.key)) });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-hidden min-h-0 flex-1 overflow-y-auto">
        {now && (
          <section>
            <h3 className="px-5 pt-1 pb-1 text-[13px] font-semibold text-[var(--player-dim)]">지금 재생 중</h3>
            <div className="flex items-center gap-3 px-5 py-2">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-work">
                <TrackCover trackId={now.trackId} className="size-full" />
                <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
                  <Level playing={state.playing} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-[var(--player-accent)]">{getTrack(now.trackId).title}</span>
                <span className="block truncate text-sm text-[var(--player-dim)]">{albumOf(now.trackId).artist}</span>
              </span>
            </div>
          </section>
        )}

        <section className="mt-3">
          <div className="flex items-center justify-between px-5">
            <h3 className="text-[13px] font-semibold text-[var(--player-dim)]">
              다음 곡 <span className="nums font-normal">{upcoming.length}</span>
            </h3>
            {upcoming.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: "clearUpcoming" })}
                className="h-8 px-1 text-sm text-[var(--player-dim)] underline decoration-1 underline-offset-[3px] transition-colors duration-[120ms] hover:text-[var(--player-ink)]"
              >
                지우기
              </button>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="px-5 py-6 text-[15px] text-[var(--player-dim)]">다음 곡이 없습니다</p>
          ) : (
            <Reorder.Group axis="y" values={upcoming} onReorder={(next) => dispatch({ type: "reorder", upcoming: next })} className="mt-1">
              {upcoming.map((item, offset) => (
                <UpcomingRow
                  key={item.key}
                  item={item}
                  tone={tone}
                  onPlay={() => dispatch({ type: "jump", index: state.index + 1 + offset })}
                  onMove={(step) => moveUpcoming(offset, step)}
                />
              ))}
            </Reorder.Group>
          )}
        </section>
      </div>

      {/* 셔플과 반복은 칸을 채우지 않고 켜졌을 때 강조색 글자로만 보인다(사용자 피드백 2026-11-28 "박스가 촌스러움"). */}
      <div className="grid grid-cols-2 gap-2 px-5 pt-3">
        <button
          type="button"
          onClick={toggleShuffle}
          aria-pressed={state.shuffle}
          className={`flex h-10 items-center justify-center gap-2 rounded-work text-sm font-medium transition-colors duration-[120ms] ${
            state.shuffle ? "text-[var(--player-accent)]" : "text-[var(--player-dim)] hover:text-[var(--player-ink)]"
          }`}
        >
          <Icon name="shuffle" size={18} />
          셔플
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "repeat" })}
          aria-label={`반복: ${state.repeat === "off" ? "끔" : state.repeat === "all" ? "전체" : "한 곡"}`}
          className={`flex h-10 items-center justify-center gap-2 rounded-work text-sm font-medium transition-colors duration-[120ms] ${
            state.repeat !== "off" ? "text-[var(--player-accent)]" : "text-[var(--player-dim)] hover:text-[var(--player-ink)]"
          }`}
        >
          <Icon name="repeat" size={18} />
          {state.repeat === "one" ? "한 곡 반복" : state.repeat === "all" ? "전체 반복" : "반복"}
        </button>
      </div>
    </div>
  );
}
