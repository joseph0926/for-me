// 홈: 이어보기 줄, 폴더 바로가기, 최근 추가한 영상. 모두 같은 시청 기록(watch)에서 계산한다.
import type { ReactNode } from "react";

import { Icon } from "../components/Icon";
import { SceneCanvas } from "../components/SceneCanvas";
import {
  ROOT_FOLDER_ID,
  type Video,
  type WatchMap,
  childFolders,
  countVideos,
  folderById,
  videos,
  videosIn,
  watchStatus,
} from "../data";
import { formatLength, formatRemaining } from "../format";

export function HomeScreen({
  watch,
  onPlay,
  onOpenDetail,
  onOpenFolder,
}: {
  watch: WatchMap;
  onPlay: (videoId: string) => void;
  onOpenDetail: (videoId: string) => void;
  onOpenFolder: (folderId: string) => void;
}) {
  const continueWatching = videos
    .filter((video) => watchStatus(video, watch) === "watching")
    .sort((a, b) => watch[b.id].order - watch[a.id].order);
  const recentlyAdded = [...videos].sort((a, b) => b.addedOn.localeCompare(a.addedOn)).slice(0, 6);
  const topFolders = childFolders(ROOT_FOLDER_ID);

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-6">
      <header className="px-5 pt-5 pb-4">
        <p className="text-[13px] font-medium text-muted">필름함</p>
        <h1 className="mt-0.5 text-[28px] font-bold tracking-[-0.02em]">홈</h1>
      </header>

      <Section title="이어보기">
        {continueWatching.length === 0 ? (
          <p className="px-5 text-sm text-muted">보던 영상이 없습니다. 보관함에서 영상을 열어 보세요.</p>
        ) : (
          <Row>
            {continueWatching.map((video) => (
              <ContinueCard
                key={video.id}
                video={video}
                position={watch[video.id].positionSec}
                onPlay={() => onPlay(video.id)}
                onOpen={() => onOpenDetail(video.id)}
              />
            ))}
          </Row>
        )}
      </Section>

      <Section title="폴더" action={{ label: "모두 보기", onClick: () => onOpenFolder(ROOT_FOLDER_ID) }}>
        <Row>
          {topFolders.map((folder) => {
            const cover = firstVideoUnder(folder.id);
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => onOpenFolder(folder.id)}
                className="relative w-[136px] shrink-0 snap-start overflow-hidden rounded-xl bg-raised text-left"
              >
                {cover && <SceneCanvas video={cover} time={cover.durationSec * 0.3} width={272} className="h-[76px] w-full opacity-45" />}
                <span className="absolute top-2.5 left-3 text-ink/90">
                  <Icon name="folder" size={18} />
                </span>
                <span className="block px-3 pt-2 pb-2.5">
                  <span className="block truncate text-[14px] font-semibold">{folder.name}</span>
                  <span className="tabular block text-[12px] text-muted">영상 {countVideos(folder.id)}개</span>
                </span>
              </button>
            );
          })}
        </Row>
      </Section>

      <Section title="최근 추가">
        <Row>
          {recentlyAdded.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => onOpenDetail(video.id)}
              className="w-[160px] shrink-0 snap-start text-left"
            >
              <span className="relative block overflow-hidden rounded-lg">
                <SceneCanvas video={video} time={video.durationSec * 0.45} width={320} className="aspect-video w-full" />
                <span className="tabular absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium">
                  {formatLength(video.durationSec)}
                </span>
              </span>
              <span className="mt-1.5 flex items-center gap-1.5">
                {watchStatus(video, watch) === "new" && (
                  <span className="shrink-0 rounded-sm border border-accent/70 px-1 text-[10px] leading-[15px] font-semibold text-accent">
                    새 영상
                  </span>
                )}
                <span className="truncate text-[13px] font-medium">{video.title}</span>
              </span>
            </button>
          ))}
        </Row>
      </Section>
    </div>
  );
}

function ContinueCard({
  video,
  position,
  onPlay,
  onOpen,
}: {
  video: Video;
  position: number;
  onPlay: () => void;
  onOpen: () => void;
}) {
  const folder = folderById(video.folderId);
  const ratio = position / video.durationSec;
  return (
    <div className="w-[78%] max-w-[300px] shrink-0 snap-start">
      <div className="relative overflow-hidden rounded-xl">
        <button type="button" onClick={onOpen} className="block w-full" aria-label={`${video.title} 정보`}>
          <SceneCanvas video={video} time={position} width={600} className="aspect-video w-full" />
        </button>
        <button
          type="button"
          onClick={onPlay}
          aria-label={`${video.title} 이어서 재생`}
          className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-black/35 text-white backdrop-blur-sm transition active:scale-95"
        >
          <Icon name="play" size={22} className="translate-x-px" />
        </button>
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
          <span className="block h-full bg-accent" style={{ width: `${ratio * 100}%` }} />
        </span>
      </div>
      <button type="button" onClick={onOpen} className="mt-2 block w-full text-left">
        <span className="block truncate text-[14px] font-semibold">{video.title}</span>
        <span className="tabular block truncate text-[12px] text-muted">
          {folder && folder.id !== ROOT_FOLDER_ID ? `${folder.name} · ` : ""}
          {formatRemaining(video.durationSec - position)}
        </span>
      </button>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-2.5 flex items-baseline justify-between px-5">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {action && (
          <button type="button" onClick={action.onClick} className="text-[13px] font-medium text-accent">
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5">{children}</div>;
}

function firstVideoUnder(folderId: string): Video | undefined {
  const own = videosIn(folderId)[0];
  if (own) return own;
  for (const child of childFolders(folderId)) {
    const found = firstVideoUnder(child.id);
    if (found) return found;
  }
  return undefined;
}
