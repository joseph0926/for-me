// 보관함: 상위 폴더, 하위 폴더, 영상 순서로 한 폴더의 내용을 보여 준다.
import { Icon } from "../components/Icon";
import { SceneCanvas } from "../components/SceneCanvas";
import {
  ROOT_FOLDER_ID,
  TODAY,
  type Video,
  type WatchMap,
  childFolders,
  countVideos,
  folderById,
  videosIn,
  watchStatus,
} from "../data";
import { formatShortDate, formatSize, formatTime } from "../format";

export function LibraryScreen({
  folderId,
  watch,
  onOpenFolder,
  onOpenDetail,
}: {
  folderId: string;
  watch: WatchMap;
  onOpenFolder: (folderId: string) => void;
  onOpenDetail: (videoId: string) => void;
}) {
  const folder = folderById(folderId) ?? folderById(ROOT_FOLDER_ID)!;
  const parent = folder.parentId ? folderById(folder.parentId) : undefined;
  const subfolders = childFolders(folder.id);
  const folderVideos = videosIn(folder.id);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
        {parent ? (
          <button
            type="button"
            onClick={() => onOpenFolder(parent.id)}
            aria-label="상위 폴더로"
            className="grid size-10 shrink-0 place-items-center"
          >
            <Icon name="back" size={22} />
          </button>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-bold">{folder.name}</h1>
        <span className="tabular shrink-0 pr-2 text-[12px] text-muted">영상 {countVideos(folder.id)}개</span>
      </header>

      <ul className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-1">
        {parent && (
          <FolderRow name=".." caption={`상위 폴더 · ${parent.name}`} onClick={() => onOpenFolder(parent.id)} />
        )}
        {subfolders.map((child) => (
          <FolderRow
            key={child.id}
            name={child.name}
            caption={`영상 ${countVideos(child.id)}개`}
            onClick={() => onOpenFolder(child.id)}
          />
        ))}
        {folderVideos.map((video) => (
          <VideoRow key={video.id} video={video} watch={watch} onClick={() => onOpenDetail(video.id)} />
        ))}
        {subfolders.length === 0 && folderVideos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted">이 폴더에는 영상이 없습니다.</li>
        )}
      </ul>
    </div>
  );
}

function FolderRow({ name, caption, onClick }: { name: string; caption: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-raised">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-raised text-muted">
          <Icon name="folder" size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{name}</span>
          <span className="tabular block text-[12px] text-muted">{caption}</span>
        </span>
        <Icon name="chevron" size={18} className="shrink-0 text-faint" />
      </button>
    </li>
  );
}

function VideoRow({ video, watch, onClick }: { video: Video; watch: WatchMap; onClick: () => void }) {
  const status = watchStatus(video, watch);
  const position = watch[video.id]?.positionSec ?? 0;
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 px-4 py-2.5 text-left active:bg-raised">
        <SceneCanvas
          video={video}
          time={status === "new" ? video.durationSec * 0.2 : position}
          width={192}
          className="h-[54px] w-24 shrink-0 rounded-md object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-medium ${status === "watching" ? "text-accent" : ""}`}>
            {video.title}
          </span>
          <span className="tabular block truncate text-[12px] text-muted">
            {video.format} · {formatSize(video.sizeMB)} · {formatShortDate(video.addedOn, TODAY)}
          </span>
          <span className="tabular block text-[12px] text-muted">
            {formatTime(position)} / {formatTime(video.durationSec)}
          </span>
        </span>
        <WatchMark status={status} ratio={position / video.durationSec} />
      </button>
    </li>
  );
}

// 보던 영상은 본 만큼 채운 원, 다 본 영상은 체크, 안 본 영상은 "새 영상" 상자
function WatchMark({ status, ratio }: { status: ReturnType<typeof watchStatus>; ratio: number }) {
  if (status === "new") {
    return (
      <span className="shrink-0 rounded-sm border border-accent/70 px-1 text-[10px] leading-[15px] font-semibold text-accent">
        새 영상
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="shrink-0 text-faint" aria-label="다 봄">
        <Icon name="check" size={18} />
      </span>
    );
  }
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" className="shrink-0 -rotate-90 text-accent" aria-label={`${Math.round(ratio * 100)}% 봄`}>
      <circle cx={11} cy={11} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.8} />
      <circle
        cx={11}
        cy={11}
        r={radius / 2}
        fill="none"
        stroke="currentColor"
        strokeWidth={radius}
        strokeDasharray={`${(ratio * Math.PI * radius).toFixed(2)} ${circumference}`}
      />
    </svg>
  );
}
