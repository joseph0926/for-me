// 목록 상세: 큰 커버 아래 제목, 설명, 만든 사람과 총 길이, 셔플과 큰 재생 원을 한 줄에 둔 뒤 곡 행.
// 플레이리스트, 음반, 보관함 바로가기(좋아요, 최근 재생, 많이 들은 곡)가 같은 모양을 쓴다.
import { useRef, type ReactNode } from "react";

import { CoverArtwork, MosaicCover } from "../components/Cover";
import { Icon } from "../components/Icon";
import { TopBar, useHiddenUnderBar } from "../components/TopBar";
import { TrackRow } from "../components/TrackRow";
import { albumTracks, editorPlaylists, getAlbum, getTrack } from "../data";
import { totalLength } from "../format";
import { shuffled, type MusicState } from "../music";
import { useMusic } from "../MusicProvider";
import { useUi, type Route } from "../ui";

interface CollectionView {
  id: string;
  title: string;
  // 굵게 쓰는 주인(아티스트나 만든 사람)과 그 뒤에 붙는 연도 같은 보조 정보.
  owner: string;
  extra?: string;
  description: string;
  trackIds: string[];
  cover: ReactNode;
  numbered: boolean;
  empty: string;
}

const coverClass = "aspect-square w-full overflow-hidden rounded-work";

function describe(route: Exclude<Route, { kind: "albums" }>, state: MusicState): CollectionView {
  switch (route.kind) {
    case "album": {
      const album = getAlbum(route.id);
      return {
        id: album.id,
        title: album.title,
        owner: album.artist,
        extra: String(album.year),
        description: "",
        trackIds: albumTracks(album.id).map((track) => track.id),
        cover: <CoverArtwork art={album.cover} className={coverClass} />,
        numbered: true,
        empty: "",
      };
    }
    case "playlist": {
      const playlist = [...editorPlaylists, ...state.myPlaylists].find((item) => item.id === route.id);
      if (!playlist) throw new Error(`없는 플레이리스트 ${route.id}`);
      return {
        id: playlist.id,
        title: playlist.title,
        owner: playlist.by,
        description: playlist.description,
        trackIds: playlist.trackIds,
        cover: playlist.cover ? <CoverArtwork art={playlist.cover} className={coverClass} /> : <MosaicCover trackIds={playlist.trackIds} className={coverClass} />,
        numbered: false,
        empty: "곡을 담아 플레이리스트를 채우세요",
      };
    }
    case "liked":
      return {
        id: "liked",
        title: "좋아요",
        owner: "나",
        description: "",
        trackIds: state.liked,
        cover: <MosaicCover trackIds={state.liked} className={coverClass} />,
        numbered: false,
        empty: "마음에 드는 곡에 하트를 눌러 모으세요",
      };
    case "recent":
      return {
        id: "recent",
        title: "최근 재생",
        owner: "나",
        description: "",
        trackIds: state.history,
        cover: <MosaicCover trackIds={state.history} className={coverClass} />,
        numbered: false,
        empty: "음반을 골라 첫 곡을 들어 보세요",
      };
    case "top": {
      const ranked = Object.entries(state.playCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      return {
        id: "top",
        title: "많이 들은 곡",
        owner: "나",
        description: "",
        trackIds: ranked,
        cover: <MosaicCover trackIds={ranked} className={coverClass} />,
        numbered: true,
        empty: "음반을 골라 첫 곡을 들어 보세요",
      };
    }
  }
}

export function Collection({ route }: { route: Exclude<Route, { kind: "albums" }> }) {
  const { state, dispatch } = useMusic();
  const ui = useUi();
  const view = describe(route, state);
  const seconds = view.trackIds.reduce((sum, id) => sum + getTrack(id).seconds, 0);
  const isSource = state.sourceId === view.id;
  const isPlaying = isSource && state.playing;
  const hasTracks = view.trackIds.length > 0;
  const top = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scrolled = useHiddenUnderBar(top, 0);
  const titlePassed = useHiddenUnderBar(heading);

  function playFrom(start: number) {
    dispatch({ type: "play", trackIds: view.trackIds, start, shuffle: false, sourceId: view.id });
  }

  function playShuffled() {
    dispatch({ type: "play", trackIds: shuffled(view.trackIds), start: 0, shuffle: true, sourceId: view.id });
    ui.notify("섞어서 재생합니다");
  }

  return (
    <div className="pb-6">
      <div ref={top} aria-hidden="true" className="h-px" />
      <TopBar title={view.title} scrolled={scrolled} showTitle={titlePassed} />

      <div className="mx-auto w-[62%] max-w-[240px] shadow-[var(--shadow)]">{view.cover}</div>

      <div className="px-5 pt-5">
        <h1 ref={heading} className="title text-[26px] leading-tight">{view.title}</h1>
        {view.description && <p className="mt-1.5 line-clamp-2 text-[15px] leading-[1.55] text-muted">{view.description}</p>}
        <div className="mt-3 flex items-center gap-3">
          <p className="nums min-w-0 flex-1 truncate text-sm text-muted">
            <span className="font-medium text-ink">{view.owner}</span>
            {view.extra && ` · ${view.extra}`}
            {" · "}
            {view.trackIds.length}곡{hasTracks && `, ${totalLength(seconds)}`}
          </p>
          <button
            type="button"
            onClick={playShuffled}
            disabled={!hasTracks}
            aria-label="섞어서 재생"
            className="grid size-11 place-items-center rounded-work text-muted hover:bg-sunken disabled:opacity-40"
          >
            <Icon name="shuffle" />
          </button>
          <button
            type="button"
            onClick={() => (isSource ? dispatch({ type: "toggle" }) : playFrom(0))}
            disabled={!hasTracks}
            aria-label={isPlaying ? "일시정지" : "재생"}
            className="grid size-14 place-items-center rounded-full bg-accent text-accent-ink transition-[filter,transform] duration-[120ms] ease-[ease-out] hover:brightness-[0.88] active:scale-95 disabled:opacity-40"
          >
            <Icon name={isPlaying ? "pause" : "play"} size={22} />
          </button>
        </div>
      </div>

      {hasTracks ? (
        <ul className="mt-3">
          {view.trackIds.map((id, index) => (
            <TrackRow key={`${id}-${index}`} trackId={id} number={view.numbered ? index + 1 : undefined} onPlay={() => playFrom(index)} />
          ))}
        </ul>
      ) : (
        <div className="mt-10 flex flex-col items-center px-8 text-center">
          <Icon name="disc" size={32} className="text-muted" />
          <p className="mt-3 text-[15px] leading-[1.55]">{view.empty}</p>
          <button type="button" onClick={() => ui.open({ kind: "albums" })} className="button button-primary mt-4">
            음반 둘러보기
          </button>
        </div>
      )}
    </div>
  );
}
