// 곡 행: 커버(또는 트랙 번호), 제목과 아티스트 두 줄, 오른쪽 끝 더보기.
import { albumOf, getTrack } from "../data";
import { clock } from "../format";
import { currentTrackId } from "../music";
import { useMusic } from "../MusicProvider";
import { useUi } from "../ui";
import { TrackCover } from "./Cover";
import { Icon } from "./Icon";
import { Level } from "./Level";

export function TrackRow({ trackId, number, onPlay }: { trackId: string; number?: number; onPlay: () => void }) {
  const { state } = useMusic();
  const ui = useUi();
  const track = getTrack(trackId);
  const isCurrent = currentTrackId(state) === trackId;
  const detail = number === undefined ? albumOf(trackId).artist : clock(track.seconds);

  return (
    <li className="flex items-center gap-1 pr-1">
      <button type="button" onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-5 text-left">
        {number === undefined ? (
          <span className="relative size-11 shrink-0 overflow-hidden rounded-work">
            <TrackCover trackId={trackId} className="size-full" />
            {isCurrent && (
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
                <Level playing={state.playing} />
              </span>
            )}
          </span>
        ) : (
          <span className="nums grid w-6 shrink-0 place-items-center text-sm text-muted">
            {isCurrent ? <Level playing={state.playing} className="text-accent" /> : number}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-medium ${isCurrent ? "text-accent-text" : ""}`}>{track.title}</span>
          <span className="nums block truncate text-sm text-muted">{detail}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => ui.openActions(trackId)}
        aria-label={`${track.title} 더보기`}
        className="grid size-10 shrink-0 place-items-center rounded-work text-muted hover:bg-sunken"
      >
        <Icon name="more" size={20} />
      </button>
    </li>
  );
}
