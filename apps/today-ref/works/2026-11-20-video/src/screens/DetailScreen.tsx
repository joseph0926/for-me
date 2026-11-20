// 영상 상세: 장면 배경, 제목과 한 줄 정보, 본 만큼 채워지는 이어보기 버튼, 파일 정보 표
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

  const fileInfo: [string, string][] = [
    ["영상", `${video.resolution}, ${video.videoCodec}`],
    ["음성", video.audio],
    ["자막", video.subtitles.length > 0 ? video.subtitles.map((track) => track.label).join(", ") : "없음"],
    ["파일", video.fileName],
    ["용량", formatSize(video.sizeMB)],
  ];

  return (
    <div className="no-scrollbar relative h-full overflow-y-auto bg-surface">
      <div className="relative">
        <SceneCanvas video={video} time={status === "new" ? video.durationSec * 0.25 : position} width={780} className="aspect-[4/3] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-surface" />
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로"
          className="absolute top-3 left-3 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <Icon name="back" size={22} />
        </button>
      </div>

      <div className="relative -mt-16 px-5 pb-8">
        {folder && folder.id !== ROOT_FOLDER_ID && (
          <p className="text-[13px] font-medium text-muted">
            {folder.name}
            {siblings.length > 1 && ` · ${episodeIndex + 1}/${siblings.length}`}
          </p>
        )}
        <h1 className="mt-1 text-[24px] leading-tight font-bold tracking-[-0.02em]">{video.title}</h1>
        <p className="tabular mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
          <span>{formatLength(video.durationSec)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(video.addedOn)}</span>
          <span className="rounded-sm border border-muted/60 px-1 text-[11px] leading-4 font-semibold">{height}p</span>
          <span>{video.format}</span>
        </p>

        <ResumeButton status={status} position={position} duration={video.durationSec} onClick={() => onPlay(status === "finished")} />
        {status === "watching" && (
          <button
            type="button"
            onClick={() => onPlay(true)}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-raised text-[14px] font-medium"
          >
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
      className="relative mt-5 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-ink text-[15px] font-bold text-surface transition active:scale-[0.99]"
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
