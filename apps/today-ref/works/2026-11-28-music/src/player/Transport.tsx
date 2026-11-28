// 재생 화면이 모드마다 함께 쓰는 재생바와 이전, 재생, 다음 버튼.
import type { CSSProperties } from "react";

import { Icon } from "../components/Icon";
import { getTrack } from "../data";
import { clock } from "../format";
import { currentTrackId } from "../music";
import { useMusic } from "../MusicProvider";

export function Seekbar() {
  const { state, dispatch } = useMusic();
  const trackId = currentTrackId(state);
  if (!trackId) return null;
  const { seconds, title } = getTrack(trackId);
  const fill = `${(state.position / seconds) * 100}%`;

  return (
    <div>
      <input
        type="range"
        className="seek"
        min={0}
        max={seconds}
        step={1}
        value={Math.floor(state.position)}
        onChange={(event) => dispatch({ type: "seek", position: Number(event.target.value) })}
        aria-label={`${title} 재생 위치`}
        aria-valuetext={`${clock(state.position)} / ${clock(seconds)}`}
        style={{ "--fill": fill } as CSSProperties}
      />
      <div className="nums -mt-0.5 flex justify-between text-xs text-[var(--player-dim)]">
        <span>{clock(state.position)}</span>
        <span>-{clock(seconds - state.position)}</span>
      </div>
    </div>
  );
}

// 가사와 대기열에서도 커버 화면과 같은 크기로 둔다(r2의 가사 화면도 조작 크기가 같다).
// 누름은 다른 버튼(.button, 상세의 재생 원)과 같은 0.95배, 120ms ease-out이다.
const pressClass = "transition-transform duration-[120ms] ease-[ease-out] active:scale-95 motion-reduce:active:scale-100";

export function Controls() {
  const { state, dispatch } = useMusic();

  return (
    <div className="flex items-center justify-center gap-12">
      <button type="button" onClick={() => dispatch({ type: "prev" })} aria-label="이전 곡" className={`grid size-14 place-items-center rounded-work ${pressClass}`}>
        <Icon name="prev" size={34} />
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: "toggle" })}
        aria-label={state.playing ? "일시정지" : "재생"}
        className={`grid size-16 place-items-center rounded-work ${pressClass}`}
      >
        <Icon name={state.playing ? "pause" : "play"} size={44} />
      </button>
      <button type="button" onClick={() => dispatch({ type: "next" })} aria-label="다음 곡" className={`grid size-14 place-items-center rounded-work ${pressClass}`}>
        <Icon name="next" size={34} />
      </button>
    </div>
  );
}
