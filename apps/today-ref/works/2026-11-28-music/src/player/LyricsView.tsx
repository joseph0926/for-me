// 가사: 현재 줄을 굵고 밝게, 나머지는 흐리게. 줄을 누르면 그 위치로 이동한다.
import { useEffect, useRef } from "react";

import { getTrack } from "../data";
import { useMusic } from "../MusicProvider";
import { currentTrackId } from "../music";
import { currentLine } from "./lyrics";

export function LyricsView() {
  const { state, dispatch } = useMusic();
  const trackId = currentTrackId(state);
  const lyrics = trackId ? (getTrack(trackId).lyrics ?? []) : [];
  const active = currentLine(lyrics, state.position);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 화면의 스크롤 위치를 재생 위치에 맞춘다(브라우저 스크롤이라는 바깥 상태와의 동기화).
  useEffect(() => {
    const target = lineRefs.current[Math.max(active, 0)];
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, trackId]);

  if (lyrics.length === 0) {
    return <p className="grid h-full place-items-center px-8 text-center text-[15px] text-[var(--player-dim)]">가사가 없는 연주곡입니다.</p>;
  }

  return (
    <ol className="scroll-hidden h-full overflow-y-auto px-6 py-[30%]">
      {lyrics.map((line, index) => (
        <li key={line.at}>
          <button
            ref={(node) => {
              lineRefs.current[index] = node;
            }}
            type="button"
            onClick={() => dispatch({ type: "seek", position: line.at })}
            aria-current={index === active ? "true" : undefined}
            className={`block w-full py-2 text-left text-[22px] leading-snug font-semibold transition-opacity duration-300 ${
              index === active ? "opacity-100" : "opacity-35 hover:opacity-60"
            }`}
          >
            {line.text}
          </button>
        </li>
      ))}
    </ol>
  );
}
