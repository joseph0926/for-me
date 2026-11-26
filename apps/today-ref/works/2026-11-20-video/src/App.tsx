// 동영상 앱 "필름함". 시청 기록(watch) 하나를 홈, 보관함, 상세, 재생 화면이 함께 읽고,
// 재생 화면을 닫을 때 그 위치를 기록에 남긴다.
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { type Tab, TabBar } from "./components/TabBar";
import {
  FINISHED_MARGIN_SEC,
  ROOT_FOLDER_ID,
  type WatchMap,
  externalSubtitleFor,
  initialWatch,
  videoById,
  watchStatus,
} from "./data";
import { Player } from "./player/Player";
import { DetailScreen } from "./screens/DetailScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LibraryScreen } from "./screens/LibraryScreen";

const MIN_SAVED_POSITION_SEC = 10;

interface Playing {
  videoId: string;
  startAt: number;
}

export function App() {
  const [watch, setWatch] = useState<WatchMap>(initialWatch);
  const [tab, setTab] = useState<Tab>("home");
  const [libraryFolderId, setLibraryFolderId] = useState(ROOT_FOLDER_ID);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [speed, setSpeed] = useState(1);
  const [landscape, setLandscape] = useState(false);
  // 영상마다 고른 자막. 값이 없으면 영상에 들어 있는 첫 자막을 쓰고, null은 끈 상태다.
  const [subtitleChoice, setSubtitleChoice] = useState<Record<string, string | null>>({});
  const [externalLoaded, setExternalLoaded] = useState<Record<string, boolean>>({});

  const detailVideo = detailId ? videoById(detailId) : undefined;
  const playingVideo = playing ? videoById(playing.videoId) : undefined;

  // 열자마자 닫은 영상이 이어보기에 올라오거나, 다 본 영상의 기록이 몇 초짜리로 덮이지 않도록
  // 처음 몇 초 안에 닫으면 기존 기록을 그대로 둔다.
  const saveProgress = (videoId: string, position: number) => {
    if (position < MIN_SAVED_POSITION_SEC) return;
    setWatch((current) => {
      const order = Math.max(0, ...Object.values(current).map((state) => state.order)) + 1;
      return { ...current, [videoId]: { positionSec: Math.round(position), order } };
    });
  };

  // 다 본 영상을 다시 열거나 처음부터 보기를 고르면 0초에서, 아니면 저장한 위치에서 시작한다.
  const play = (videoId: string, fromStart = false) => {
    const video = videoById(videoId);
    if (!video) return;
    const saved = watch[videoId]?.positionSec ?? 0;
    const startAt = fromStart || watchStatus(video, watch) === "finished" ? 0 : saved;
    setPlaying({ videoId, startAt: Math.min(startAt, video.durationSec - FINISHED_MARGIN_SEC) });
  };

  const openFolder = (folderId: string) => {
    setLibraryFolderId(folderId);
    setDetailId(null);
    setTab("library");
  };

  const tracksFor = (videoId: string) => {
    const video = videoById(videoId);
    if (!video) return [];
    return externalLoaded[videoId] ? [...video.subtitles, externalSubtitleFor(video)] : video.subtitles;
  };

  const subtitleIdFor = (videoId: string): string | null => {
    if (videoId in subtitleChoice) return subtitleChoice[videoId];
    return videoById(videoId)?.subtitles[0]?.id ?? null;
  };

  return (
    <div className="relative flex h-full flex-col">
      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            {tab === "home" ? (
              <HomeScreen watch={watch} onPlay={play} onOpenDetail={setDetailId} onOpenFolder={openFolder} />
            ) : (
              <LibraryScreen folderId={libraryFolderId} watch={watch} onOpenFolder={setLibraryFolderId} onOpenDetail={setDetailId} />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {detailVideo && (
            // 상세는 tastepin 화면 전환 값대로 오른쪽 24px에서 2px 흐림이 걷히며 들어오고, 같은 길로 나간다.
            // 화면 끝에서 큰 면을 스프링으로 밀어 넣지 않는다(드로어 예외 규칙).
            <motion.div
              key={detailVideo.id}
              className="absolute inset-0 z-20"
              initial={{ x: 24, opacity: 0, filter: "blur(2px)" }}
              animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ x: 24, opacity: 0, filter: "blur(2px)" }}
              transition={{ duration: 0.24, ease: [0.215, 0.61, 0.355, 1] }}
            >
              <DetailScreen
                video={detailVideo}
                watch={watch}
                onBack={() => setDetailId(null)}
                onPlay={(fromStart) => play(detailVideo.id, fromStart)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <TabBar
        current={tab}
        onChange={(next) => {
          setDetailId(null);
          setTab(next);
        }}
      />

      {playing && playingVideo && (
        <Player
          key={playingVideo.id}
          video={playingVideo}
          startAt={playing.startAt}
          speed={speed}
          landscape={landscape}
          tracks={tracksFor(playingVideo.id)}
          subtitleId={subtitleIdFor(playingVideo.id)}
          hasExternal={Boolean(externalLoaded[playingVideo.id])}
          onSpeedChange={setSpeed}
          onToggleLandscape={() => setLandscape((value) => !value)}
          onSelectSubtitle={(trackId) => setSubtitleChoice((current) => ({ ...current, [playingVideo.id]: trackId }))}
          onLoadExternal={() => {
            setExternalLoaded((current) => ({ ...current, [playingVideo.id]: true }));
            setSubtitleChoice((current) => ({ ...current, [playingVideo.id]: "external" }));
          }}
          onSwitch={(nextId, position) => {
            saveProgress(playingVideo.id, position);
            play(nextId);
          }}
          onClose={(position) => {
            saveProgress(playingVideo.id, position);
            setPlaying(null);
          }}
        />
      )}
    </div>
  );
}
