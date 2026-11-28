// 홈: 작은 머리말을 단 추천 곡 세 줄, 최근 들은 음반 커버 줄과 전체보기, 에디터 플레이리스트 줄.
import { CoverArtwork, TrackCover } from "../components/Cover";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { albumOf, albumTracks, editorPlaylists, getTrack, homePicks } from "../data";
import { currentTrackId } from "../music";
import { useMusic } from "../MusicProvider";
import { useUi } from "../ui";

export function Home() {
  const { state, dispatch } = useMusic();
  const ui = useUi();

  const mostPlayed = Object.entries(state.playCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "t1";
  const picks = [{ label: "이번 주 가장 많이 들은 곡", trackId: mostPlayed }, ...homePicks];
  const recentAlbums = [...new Map(state.history.map((id) => [albumOf(id).id, albumOf(id)])).values()].slice(0, 6);

  function playFromAlbum(trackId: string) {
    const album = albumOf(trackId);
    const ids = albumTracks(album.id).map((track) => track.id);
    dispatch({ type: "play", trackIds: ids, start: ids.indexOf(trackId), shuffle: false, sourceId: album.id });
  }

  return (
    <div className="pb-6">
      <header className="px-5 pt-5 pb-3">
        <h1 className="title text-[28px]">홈</h1>
      </header>

      <ul className="flex flex-col">
        {picks.map((pick) => {
          const track = getTrack(pick.trackId);
          const isCurrent = currentTrackId(state) === pick.trackId;
          const isPlaying = isCurrent && state.playing;
          return (
            <li key={pick.label} className="flex items-center gap-3 px-5 py-2.5">
              <button type="button" onClick={() => playFromAlbum(pick.trackId)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <TrackCover trackId={pick.trackId} className="size-14 shrink-0 rounded-work" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-accent-text">{pick.label}</span>
                  <span className="block truncate text-[15px] font-medium">{track.title}</span>
                  <span className="block truncate text-sm text-muted">{albumOf(pick.trackId).artist}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => (isCurrent ? dispatch({ type: "toggle" }) : playFromAlbum(pick.trackId))}
                aria-label={isPlaying ? `${track.title} 일시정지` : `${track.title} 재생`}
                className="grid size-10 shrink-0 place-items-center rounded-work text-ink hover:bg-sunken"
              >
                {isPlaying ? <Level playing className="text-accent" /> : <Icon name="play" size={16} />}
              </button>
            </li>
          );
        })}
      </ul>

      <section className="mt-7">
        <div className="flex items-baseline justify-between px-5">
          <h2 className="text-[17px] font-semibold">최근 들은 음반</h2>
          <button type="button" onClick={() => ui.open({ kind: "albums" })} className="text-action text-sm">
            전체보기
          </button>
        </div>
        <ul className="scroll-hidden mt-3 flex gap-3 overflow-x-auto px-5">
          {recentAlbums.map((album) => (
            <li key={album.id} className="w-[132px] shrink-0">
              <button type="button" onClick={() => ui.open({ kind: "album", id: album.id })} className="block w-full text-left">
                <CoverArtwork art={album.cover} className="aspect-square w-full rounded-work" />
                <span className="mt-2 block truncate text-[15px] font-medium">{album.title}</span>
                <span className="block truncate text-sm text-muted">{album.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h2 className="px-5 text-[17px] font-semibold">에디터가 고른 플레이리스트</h2>
        <ul className="scroll-hidden mt-3 flex gap-3 overflow-x-auto px-5">
          {editorPlaylists.map((playlist) => (
            <li key={playlist.id} className="w-[132px] shrink-0">
              <button type="button" onClick={() => ui.open({ kind: "playlist", id: playlist.id })} className="block w-full text-left">
                {playlist.cover && <CoverArtwork art={playlist.cover} className="aspect-square w-full rounded-work" />}
                <span className="mt-2 block truncate text-[15px] font-medium">{playlist.title}</span>
                <span className="nums block truncate text-sm text-muted">{playlist.trackIds.length}곡</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
