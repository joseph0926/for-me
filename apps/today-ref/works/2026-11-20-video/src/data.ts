// 휴대폰에 저장한 영상과 폴더의 가짜 목록. 실제 파일 대신 장면 종류와 색으로 화면을 그린다.

export type SceneKind = "hills" | "sea" | "city";

export interface Palette {
  skyTop: string;
  skyBottom: string;
  sun: string;
  layers: [string, string, string];
}

export interface SubtitleTrack {
  id: string;
  label: string;
  // 영상에 들어 있는 자막인지, 사용자가 연 SRT 파일인지
  source: "embedded" | "external";
  lines: string[];
}

export interface Video {
  id: string;
  title: string;
  folderId: string;
  fileName: string;
  durationSec: number;
  format: "MP4" | "MKV" | "MOV";
  sizeMB: number;
  addedOn: string;
  resolution: string;
  videoCodec: string;
  audio: string;
  scene: SceneKind;
  palette: Palette;
  subtitles: SubtitleTrack[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

// 영상마다 마지막으로 본 위치. order가 클수록 최근에 본 영상이다.
export interface WatchState {
  positionSec: number;
  order: number;
}

export type WatchMap = Record<string, WatchState>;

export const ROOT_FOLDER_ID = "root";
export const TODAY = "2026-11-20";
// 이 시간보다 적게 남으면 다 본 것으로 친다.
export const FINISHED_MARGIN_SEC = 20;

export const folders: Folder[] = [
  { id: ROOT_FOLDER_ID, name: "내 영상", parentId: null },
  { id: "drama", name: "드라마", parentId: ROOT_FOLDER_ID },
  { id: "island", name: "작은 섬의 여름 시즌 1", parentId: "drama" },
  { id: "docs", name: "다큐멘터리", parentId: ROOT_FOLDER_ID },
  { id: "trips", name: "여행 기록", parentId: ROOT_FOLDER_ID },
];

const palettes = {
  dusk: { skyTop: "#1d2a4a", skyBottom: "#e9906b", sun: "#ffd9a8", layers: ["#4b3f63", "#33304d", "#1e1d33"] },
  noon: { skyTop: "#5f9fd6", skyBottom: "#cfe6f2", sun: "#fff6d8", layers: ["#7fae7a", "#5a8c5d", "#3b6a45"] },
  sea: { skyTop: "#7cb6d9", skyBottom: "#f1e3c8", sun: "#fffbe9", layers: ["#4e8fb3", "#2f6f96", "#1c4f70"] },
  night: { skyTop: "#070b18", skyBottom: "#26304f", sun: "#e8ecf7", layers: ["#1a2036", "#141a2c", "#0c1020"] },
  winter: { skyTop: "#9fb2c7", skyBottom: "#e6ebf0", sun: "#ffffff", layers: ["#c4ccd6", "#97a3b2", "#6c7888"] },
  autumn: { skyTop: "#3d4f6b", skyBottom: "#f0b77a", sun: "#ffe2b5", layers: ["#b0643c", "#83472d", "#4f2c20"] },
} satisfies Record<string, Palette>;

const islandKo = [
  "배가 끊기기 전에 돌아와야 해.",
  "이 섬은 여름이 제일 길어.",
  "할머니가 그러셨어. 바다는 기다려 준다고.",
  "내일은 등대까지 걸어가 보자.",
  "편지는 아직 못 부쳤어.",
  "바람이 바뀌면 비가 와.",
];
const islandEn = [
  "We have to be back before the last boat.",
  "Summer lasts longest on this island.",
  "Grandma said the sea always waits.",
  "Let's walk to the lighthouse tomorrow.",
  "I still haven't sent the letter.",
  "When the wind turns, it rains.",
];
const docsKo = [
  "해가 지면 도시는 다른 얼굴이 됩니다.",
  "밤 열한 시, 마지막 버스가 출발합니다.",
  "이 골목의 불빛은 사십 년째 같은 자리에 있습니다.",
  "새벽 네 시, 첫 빵이 오븐에 들어갑니다.",
];

function track(id: string, label: string, lines: string[]): SubtitleTrack {
  return { id, label, source: "embedded", lines };
}

const islandTracks = [track("ko", "한국어", islandKo), track("en", "English", islandEn)];

export const videos: Video[] = [
  ...["바다가 보이는 방", "등대지기의 편지", "비 오는 선착장", "마지막 배"].map(
    (name, index): Video => ({
      id: `island-${index + 1}`,
      title: `${index + 1}화 ${name}`,
      folderId: "island",
      fileName: `small.island.s01e0${index + 1}.mkv`,
      durationSec: [2832, 2711, 2953, 3104][index],
      format: "MKV",
      sizeMB: [1420, 1366, 1490, 1562][index],
      addedOn: "2026-11-02",
      resolution: "1920×1080",
      videoCodec: "H.264",
      audio: "2ch, 48.0kHz, AAC",
      scene: "sea",
      palette: [palettes.sea, palettes.dusk, palettes.winter, palettes.night][index],
      subtitles: islandTracks,
    }),
  ),
  {
    id: "docs-1",
    title: "밤의 도시 1부: 불 켜진 창",
    folderId: "docs",
    fileName: "night.city.part1.mp4",
    durationSec: 3010,
    format: "MP4",
    sizeMB: 2210,
    addedOn: "2026-10-28",
    resolution: "3840×2160",
    videoCodec: "HEVC",
    audio: "6ch, 48.0kHz, AC-3",
    scene: "city",
    palette: palettes.night,
    subtitles: [track("ko", "한국어", docsKo)],
  },
  {
    id: "docs-2",
    title: "밤의 도시 2부: 첫차",
    folderId: "docs",
    fileName: "night.city.part2.mp4",
    durationSec: 2945,
    format: "MP4",
    sizeMB: 2154,
    addedOn: "2026-10-28",
    resolution: "3840×2160",
    videoCodec: "HEVC",
    audio: "6ch, 48.0kHz, AC-3",
    scene: "city",
    palette: palettes.dusk,
    subtitles: [track("ko", "한국어", docsKo)],
  },
  {
    id: "docs-3",
    title: "숲의 사계절",
    folderId: "docs",
    fileName: "four.seasons.forest.mp4",
    durationSec: 3320,
    format: "MP4",
    sizeMB: 1880,
    addedOn: "2026-11-15",
    resolution: "1920×1080",
    videoCodec: "H.264",
    audio: "2ch, 48.0kHz, AAC",
    scene: "hills",
    palette: palettes.autumn,
    subtitles: [],
  },
  {
    id: "trip-1",
    title: "제주 바다 2025-08",
    folderId: "trips",
    fileName: "VID_20250814_172204.mp4",
    durationSec: 214,
    format: "MP4",
    sizeMB: 412,
    addedOn: "2025-08-14",
    resolution: "1920×1080",
    videoCodec: "H.264",
    audio: "2ch, 48.0kHz, AAC",
    scene: "sea",
    palette: palettes.noon,
    subtitles: [],
  },
  {
    id: "trip-2",
    title: "대관령 눈길",
    folderId: "trips",
    fileName: "VID_20260118_093011.mov",
    durationSec: 96,
    format: "MOV",
    sizeMB: 188,
    addedOn: "2026-01-18",
    resolution: "1920×1080",
    videoCodec: "HEVC",
    audio: "2ch, 44.1kHz, AAC",
    scene: "hills",
    palette: palettes.winter,
    subtitles: [],
  },
  {
    id: "trip-3",
    title: "한강 노을 타임랩스",
    folderId: "trips",
    fileName: "VID_20261103_174530.mp4",
    durationSec: 48,
    format: "MP4",
    sizeMB: 96,
    addedOn: "2026-11-03",
    resolution: "1920×1080",
    videoCodec: "H.264",
    audio: "2ch, 48.0kHz, AAC",
    scene: "city",
    palette: palettes.dusk,
    subtitles: [],
  },
  {
    id: "root-1",
    title: "들판의 오후",
    folderId: ROOT_FOLDER_ID,
    fileName: "afternoon.field.mp4",
    durationSec: 1265,
    format: "MP4",
    sizeMB: 640,
    addedOn: "2026-11-19",
    resolution: "1920×1080",
    videoCodec: "H.264",
    audio: "2ch, 48.0kHz, AAC",
    scene: "hills",
    palette: palettes.noon,
    subtitles: [],
  },
];

export const initialWatch: WatchMap = {
  "island-2": { positionSec: 1318, order: 5 },
  "docs-1": { positionSec: 2210, order: 4 },
  "island-1": { positionSec: 2832, order: 3 },
  "trip-1": { positionSec: 214, order: 2 },
  "docs-3": { positionSec: 421, order: 1 },
};

// 사용자가 "외부 SRT 열기"로 고를 수 있는 파일. 실제 파일 선택기 대신 이 목록에서 고른다.
export function externalSubtitleFor(video: Video): SubtitleTrack {
  return {
    id: "external",
    label: `${video.fileName.replace(/\.[^.]+$/, "")}.ko.srt`,
    source: "external",
    lines: ["(외부 자막) " + video.title, "자막 파일을 불러와 표시하고 있습니다.", "싱크는 영상 시작에 맞춰져 있습니다."],
  };
}

export function videoById(id: string): Video | undefined {
  return videos.find((video) => video.id === id);
}

export function folderById(id: string): Folder | undefined {
  return folders.find((folder) => folder.id === id);
}

export function childFolders(folderId: string): Folder[] {
  return folders.filter((folder) => folder.parentId === folderId);
}

export function videosIn(folderId: string): Video[] {
  return videos.filter((video) => video.folderId === folderId);
}

// 하위 폴더까지 포함한 영상 수
export function countVideos(folderId: string): number {
  return videosIn(folderId).length + childFolders(folderId).reduce((sum, child) => sum + countVideos(child.id), 0);
}

export type WatchStatus = "new" | "watching" | "finished";

export function watchStatus(video: Video, watch: WatchMap): WatchStatus {
  const state = watch[video.id];
  if (!state) return "new";
  return state.positionSec >= video.durationSec - FINISHED_MARGIN_SEC ? "finished" : "watching";
}
