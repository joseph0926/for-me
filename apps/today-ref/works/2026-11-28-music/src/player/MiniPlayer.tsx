// 하단 탭 위에 붙은 미니 플레이어: 커버, 제목, 아티스트, 일시정지, 다음. 누르거나 위로 끌면 재생 화면이 열린다.
// 떠 있는 둥근 카드 대신 YouTube Music(r3-2)처럼 탭 위에 붙은 평평한 줄과 아래 가장자리의 얇은 진행선으로 둔다
// (사용자 피드백 2026-11-28 "지금 재생 중인 음악을 표시하는 줄의 박스가 촌스러움").
import { motion, type PanInfo } from "motion/react";

import { TrackCover } from "../components/Cover";
import { Icon } from "../components/Icon";
import { albumOf, getTrack } from "../data";
import { currentTrackId } from "../music";
import { useMusic } from "../MusicProvider";

const openDistance = 40;

export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const { state, dispatch } = useMusic();
  const trackId = currentTrackId(state);
  if (!trackId) return null;
  const track = getTrack(trackId);

  function endDrag(_: unknown, info: PanInfo) {
    if (info.offset.y < -openDistance) onOpen();
  }

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.25, bottom: 0 }}
      dragSnapToOrigin
      onDragEnd={endDrag}
      className="relative flex h-16 touch-none items-center gap-1 bg-raised pr-2"
    >
      <button type="button" onClick={onOpen} aria-label={`재생 화면 열기: ${track.title}`} className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left">
        <TrackCover trackId={trackId} className="size-11 shrink-0 rounded-work" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{track.title}</span>
          <span className="block truncate text-sm text-muted">{albumOf(trackId).artist}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: "toggle" })}
        aria-label={state.playing ? "일시정지" : "재생"}
        className="grid size-10 place-items-center rounded-work hover:bg-sunken"
      >
        <Icon name={state.playing ? "pause" : "play"} size={22} />
      </button>
      <button type="button" onClick={() => dispatch({ type: "next" })} aria-label="다음 곡" className="grid size-10 place-items-center rounded-work hover:bg-sunken">
        <Icon name="next" size={22} />
      </button>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-line">
        <span className="block h-full bg-ink" style={{ width: `${(state.position / track.seconds) * 100}%` }} />
      </span>
    </motion.div>
  );
}
