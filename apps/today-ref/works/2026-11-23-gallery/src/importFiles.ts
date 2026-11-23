// 사용자가 고르거나 끌어다 놓은 파일을 보관함 항목으로 바꾼다. 파일은 브라우저 메모리에만 있고 원본은 건드리지 않는다.
import type { MediaItem, MediaKind } from "./library";

export const maxImportBytes = 200 * 1024 * 1024;

export interface ImportResult {
  items: MediaItem[];
  rejected: string[];
}

function kindOf(file: File): MediaKind | null {
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

function localStamp(time: number): string {
  const date = new Date(time);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function imageSize(url: string): Promise<{ width: number; height: number }> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return { width: image.naturalWidth, height: image.naturalHeight };
}

// 동영상은 크기와 길이를 읽고, 0.1초 지점 화면을 격자용 정지 화면으로 그린다.
function videoInfo(url: string): Promise<{ width: number; height: number; duration: number; poster: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    const fail = () => reject(new Error("동영상을 읽지 못했습니다"));
    const timer = window.setTimeout(fail, 8000);
    video.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      window.clearTimeout(timer);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        poster: canvas.toDataURL("image/jpeg", 0.8),
      });
    };
  });
}

export async function importFiles(files: File[], nextOrder: number): Promise<ImportResult> {
  const items: MediaItem[] = [];
  const rejected: string[] = [];
  let order = nextOrder;
  // 파일마다 따로 판정해 한 파일의 실패가 나머지를 막지 않게 한다.
  for (const file of files) {
    const kind = kindOf(file);
    if (!kind) {
      rejected.push(`${file.name}: 이미지나 동영상이 아닙니다`);
      continue;
    }
    if (file.size > maxImportBytes) {
      rejected.push(`${file.name}: 200MB를 넘습니다`);
      continue;
    }
    const url = URL.createObjectURL(file);
    try {
      const base = {
        id: `import-${order}-${file.name}`,
        kind,
        src: url,
        name: file.name,
        bytes: file.size,
        takenAt: localStamp(file.lastModified),
        folder: "가져온 항목",
        tags: [],
        rating: 0,
        favorite: false,
        colorTag: null,
        note: "",
        trashed: false,
        addedOrder: order,
        imported: true,
      } satisfies Partial<MediaItem>;
      if (kind === "video") {
        const info = await videoInfo(url);
        items.push({ ...base, width: info.width, height: info.height, duration: info.duration, poster: info.poster });
      } else {
        items.push({ ...base, ...(await imageSize(url)) });
      }
      order += 1;
    } catch {
      URL.revokeObjectURL(url);
      rejected.push(`${file.name}: 열 수 없는 파일입니다`);
    }
  }
  return { items, rejected };
}
