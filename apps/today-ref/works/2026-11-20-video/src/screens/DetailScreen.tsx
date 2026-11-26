// 영상 상세: 장면 배경, 제목과 한 줄 정보, 본 만큼 채워지는 이어보기 버튼, 파일 정보 표
import { useState } from "react";

import { Icon } from "../components/Icon";
import { SceneCanvas } from "../components/SceneCanvas";
import { ROOT_FOLDER_ID, type Video, type WatchMap, folderById, videosIn, watchStatus } from "../data";
import { formatDate, formatLength, formatSize, formatTime } from "../format";

export function DetailScreen({
  video,
  watch,
  onBack,
  onPlay,
}: {
  video: Video;
  watch: WatchMap;
  onBack: () => void;
  onPlay: (fromStart: boolean) => void;
}) {
  const status = watchStatus(video, watch);
  const position = watch[video.id]?.positionSec ?? 0;
  const folder = folderById(video.folderId);
  const siblings = videosIn(video.folderId);
  const episodeIndex = siblings.findIndex((item) => item.id === video.id);
  const height = video.resolution.split("×")[1];
  // 장면을 지나 내려가면 머리 막대를 채우고 제목을 띄운다(tastepin OTT 작품 상세 머리 막대 값: 130px).
  const [scrolled, setScrolled] = useState(false);
  const meta = [formatLength(video.durationSec), formatDate(video.addedOn), `${height}p`, video.format];

  const fileInfo: [string, string][] = [
    ["영상", `${video.resolution}, ${video.videoCodec}`],
    ["음성", video.audio],
    ["자막", video.subtitles.length > 0 ? video.subtitles.map((track) => track.label).join(", ") : "없음"],
    ["파일", video.fileName],
    ["용량", formatSize(video.sizeMB)],
  ];

  return (
    <div className="relative h-full bg-surface">
      {/* 맨 위에서는 막대 바탕 없이 위쪽만 어둡게 해 장면 위에 뒤로를 띄운다. */}
      <header className="absolute inset-x-0 top-0 z-10 flex h-14 items-center px-2">
        {/* 어둡게 한 위쪽과 채운 막대를 겹쳐 두고 투명도만 바꿔 200ms에 넘어간다. */}
        <span className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 to-transparent" aria-hidden="true" />
        <span
          className={`absolute inset-0 -z-10 bg-surface transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />
        <button type="button" onClick={onBack} aria-label="뒤로" className="icon-btn size-10 shrink-0 text-white">
          <Icon name="back" size={22} />
        </button>
        <p
          className={`min-w-0 flex-1 truncate pr-12 text-center text-[15px] font-semibold transition-opacity duration-200 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!scrolled}
        >
          {video.title}
        </p>
      </header>

      <div className="no-scrollbar h-full overflow-y-auto" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 130)}>
        <div className="relative">
          <SceneCanvas video={video} time={status === "new" ? video.durationSec * 0.25 : position} width={780} className="aspect-[4/3] w-full object-cover" />
          {/* 폴더 이름과 제목이 장면의 밝은 부분에 묻히지 않도록 아래쪽을 바탕색으로 일찍 덮는다. */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,var(--surface)_92%)]" />
        </div>

        <div className="relative -mt-10 px-5 pb-8">
          {folder && folder.id !== ROOT_FOLDER_ID && (
            <p className="text-[13px] font-medium text-muted">
              {folder.name}
              {siblings.length > 1 && ` · ${episodeIndex + 1}/${siblings.length}`}
            </p>
          )}
          <h1 className="mt-1 text-[24px] leading-tight font-bold tracking-[-0.02em]">{video.title}</h1>
          {/* 길이, 날짜, 해상도, 형식을 같은 글자와 같은 구분점으로 잇는다. 해상도만 상자에 넣지 않는다. */}
          <p className="tabular mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
            {meta.map((item, index) => (
              <span key={item} className="contents">
                {index > 0 && <span aria-hidden="true">·</span>}
                <span>{item}</span>
              </span>
            ))}
          </p>

          <ResumeButton status={status} position={position} duration={video.durationSec} onClick={() => onPlay(status === "finished")} />
          {status === "watching" && (
            <button type="button" onClick={() => onPlay(true)} className="btn btn-secondary mt-2 w-full">
              <Icon name="replay" size={18} />
              처음부터 보기
            </button>
          )}

          <h2 className="mt-7 mb-2 text-[15px] font-bold">파일 정보</h2>
          <dl className="grid grid-cols-[52px_1fr] gap-x-3 gap-y-2 text-[13px]">
            {fileInfo.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="tabular min-w-0 break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

// 보던 영상이면 버튼 바탕이 본 만큼 채워진다.
function ResumeButton({
  status,
  position,
  duration,
  onClick,
}: {
  status: ReturnType<typeof watchStatus>;
  position: number;
  duration: number;
  onClick: () => void;
}) {
  const label = status === "watching" ? `이어보기 ${formatTime(position)}` : status === "finished" ? "다시 보기" : "재생";
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-primary relative mt-5 w-full overflow-hidden"
    >
      {status === "watching" && (
        <span className="absolute inset-y-0 left-0 bg-accent/45" style={{ width: `${(position / duration) * 100}%` }} aria-hidden="true" />
      )}
      <span className="tabular relative flex items-center gap-2">
        <Icon name={status === "finished" ? "replay" : "play"} size={18} />
        {label}
      </span>
    </button>
  );
}
