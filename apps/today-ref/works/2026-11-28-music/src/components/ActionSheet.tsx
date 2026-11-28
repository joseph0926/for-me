// 곡 더보기: 다음에 재생, 대기열 맨 뒤에 추가, 좋아요, 플레이리스트에 담기.
import { motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, useState } from "react";

import { albumOf, getTrack } from "../data";
import { sheet } from "../motion";
import { useMusic } from "../MusicProvider";
import { TrackCover } from "./Cover";
import { Icon, type IconName } from "./Icon";

// 손잡이를 잡고 이만큼 내리거나 빠르게 내리면 닫는다.
const closeDistance = 80;
const closeVelocity = 500;

export function ActionSheet({ trackId, onClose, notify }: { trackId: string; onClose: () => void; notify: (message: string) => void }) {
  const { state, dispatch } = useMusic();
  const [choosing, setChoosing] = useState(false);
  const drag = useDragControls();
  const track = getTrack(trackId);
  const liked = state.liked.includes(trackId);

  useEffect(() => {
    // 재생 화면 위에 열렸을 때 Esc가 재생 화면까지 닫지 않도록 먼저 받아 멈춘다.
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  function endDrag(_: unknown, info: PanInfo) {
    if (info.offset.y > closeDistance || info.velocity.y > closeVelocity) onClose();
  }

  function act(run: () => void, message: string) {
    run();
    notify(message);
    onClose();
  }

  const actions: { label: string; icon: IconName; run: () => void }[] = [
    { label: "다음에 재생", icon: "queueNext", run: () => act(() => dispatch({ type: "playNext", trackId }), "다음 곡으로 담았습니다") },
    { label: "대기열 맨 뒤에 추가", icon: "queueEnd", run: () => act(() => dispatch({ type: "addToEnd", trackId }), "대기열 맨 뒤에 담았습니다") },
    {
      label: liked ? "좋아요 취소" : "좋아요",
      icon: liked ? "heartFilled" : "heart",
      run: () => act(() => dispatch({ type: "like", trackId }), liked ? "좋아요를 취소했습니다" : "좋아요에 담았습니다"),
    },
    { label: "플레이리스트에 담기", icon: "addTo", run: () => setChoosing(true) },
  ];

  return (
    <div className="absolute inset-0 z-40">
      <motion.button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={sheet}
        className="absolute inset-0 bg-black/20"
      />
      <motion.div
        role="dialog"
        aria-label={`${track.title} 더보기`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={sheet}
        drag="y"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={endDrag}
        className="absolute inset-x-0 bottom-0 max-h-[85%] overflow-hidden rounded-t-work bg-raised pb-4 text-ink shadow-[var(--shadow)]"
      >
        <div onPointerDown={(event) => drag.start(event)} className="touch-none pt-2.5 pb-1">
          <span aria-hidden="true" className="mx-auto block h-1 w-9 rounded-full bg-line" />
        </div>
        <div className="flex items-center gap-3 px-5 pt-2 pb-3">
          <TrackCover trackId={trackId} className="size-11 shrink-0 rounded-work" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium">{track.title}</p>
            <p className="truncate text-sm text-muted">
              {albumOf(trackId).artist} · {albumOf(trackId).title}
            </p>
          </div>
        </div>

        {choosing ? (
          <div>
            <p className="px-5 pt-2 pb-1 text-[13px] font-semibold text-muted">담을 플레이리스트</p>
            <ul className="max-h-64 overflow-y-auto">
              {state.myPlaylists.map((playlist) => {
                const has = playlist.trackIds.includes(trackId);
                return (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      disabled={has}
                      onClick={() => act(() => dispatch({ type: "addToPlaylist", playlistId: playlist.id, trackId }), `'${playlist.title}'에 담았습니다`)}
                      className="flex h-12 w-full items-center gap-3 px-5 text-left text-[15px] hover:bg-sunken disabled:text-faint disabled:hover:bg-transparent"
                    >
                      <span className="flex-1 truncate">{playlist.title}</span>
                      {has ? <span className="text-sm">담겨 있음</span> : <span className="nums text-sm text-muted">{playlist.trackIds.length}곡</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <ul className="pt-1">
            {actions.map((action) => (
              <li key={action.label}>
                <button type="button" onClick={action.run} className="flex h-12 w-full items-center gap-3.5 px-5 text-left text-[15px] hover:bg-sunken">
                  <Icon name={action.icon} size={22} className={action.icon === "heartFilled" ? "text-accent" : "text-muted"} />
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
