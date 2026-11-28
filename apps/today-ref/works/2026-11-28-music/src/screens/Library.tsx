// 보관함: 2×2 바로가기, 내 플레이리스트 목록과 곡 수, 새로 만들기.
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";

import { MosaicCover } from "../components/Cover";
import { Icon, type IconName } from "../components/Icon";
import { quick } from "../motion";
import { useMusic } from "../MusicProvider";
import { useUi, type Route } from "../ui";

const playlistTitleLimit = 40;

export function Library() {
  const { state, dispatch } = useMusic();
  const ui = useUi();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const shortcuts: { label: string; icon: IconName; route: Route }[] = [
    { label: "좋아요", icon: "heart", route: { kind: "liked" } },
    { label: "최근 재생", icon: "clock", route: { kind: "recent" } },
    { label: "많이 들은", icon: "chart", route: { kind: "top" } },
    { label: "음반", icon: "disc", route: { kind: "albums" } },
  ];

  function create(event: FormEvent) {
    event.preventDefault();
    const name = title.trim() || `새 플레이리스트 ${state.myPlaylists.length + 1}`;
    const id = `m-${Date.now()}`;
    dispatch({ type: "createPlaylist", id, title: name });
    setCreating(false);
    setTitle("");
    ui.open({ kind: "playlist", id });
  }

  return (
    <div className="pb-6">
      <header className="px-5 pt-5 pb-3">
        <h1 className="title text-[28px]">보관함</h1>
      </header>

      {/* 바로가기는 멜론 음악서랍(r4-2)처럼 상자 없이 아이콘 아래 이름만 둔다(사용자 피드백 2026-11-28 "박스가 촌스러움"). */}
      <ul className="grid grid-cols-4 px-3">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.label}>
            <button
              type="button"
              onClick={() => ui.open(shortcut.route)}
              className="group flex w-full flex-col items-center gap-1.5 py-2 text-[13px] font-medium text-muted transition-colors duration-[120ms] hover:text-ink"
            >
              <Icon name={shortcut.icon} size={26} className="text-ink" />
              {shortcut.label}
            </button>
          </li>
        ))}
      </ul>

      <section className="mt-7">
        <h2 className="px-5 text-[17px] font-semibold">내 플레이리스트</h2>
        <div className="mt-2 flex items-center justify-between px-5">
          <span className="nums text-sm text-muted">전체 {state.myPlaylists.length}</span>
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="-mr-1 inline-flex h-11 items-center gap-1 px-1 text-sm font-semibold transition-colors duration-[120ms] hover:text-accent-text"
            >
              <Icon name="plus" size={18} />
              새로 만들기
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {creating && (
            <motion.form
              onSubmit={create}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={quick}
              className="overflow-hidden px-5"
            >
              <label className="mt-3 block text-[13px] font-semibold" htmlFor="playlist-title">
                플레이리스트 이름
              </label>
              <input
                id="playlist-title"
                autoFocus
                value={title}
                maxLength={playlistTitleLimit}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`새 플레이리스트 ${state.myPlaylists.length + 1}`}
                className="mt-1.5 h-10 w-full rounded-work border border-line bg-raised px-3 text-[15px] focus:border-accent focus:shadow-[inset_0_0_0_1px_var(--accent)] focus-visible:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setTitle("");
                  }}
                  className="text-action h-11 px-2 text-sm"
                >
                  취소
                </button>
                <button type="submit" className="button button-primary">
                  만들기
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <ul className="mt-2">
          {state.myPlaylists.map((playlist) => (
            <li key={playlist.id}>
              <button
                type="button"
                onClick={() => ui.open({ kind: "playlist", id: playlist.id })}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-sunken/60"
              >
                <MosaicCover trackIds={playlist.trackIds} className="size-14 shrink-0 overflow-hidden rounded-work" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{playlist.title}</span>
                  <span className="nums block text-sm text-muted">{playlist.trackIds.length}곡</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
