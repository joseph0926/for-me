// 가짜 음반 목록. 아티스트, 음반, 가사는 모두 지어낸 것이다.

export type CoverPattern = "grooves" | "sun" | "stripes" | "grid" | "wave" | "orbit";

export interface CoverArt {
  pattern: CoverPattern;
  ground: string;
  figure: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  cover: CoverArt;
  // 재생 화면 배경. 커버에서 고른 어두운 색이다.
  tone: string;
}

export interface LyricLine {
  at: number;
  text: string;
}

export interface Track {
  id: string;
  title: string;
  albumId: string;
  seconds: number;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  title: string;
  by: string;
  description: string;
  trackIds: string[];
  // 없으면 담긴 곡의 음반 커버 네 개를 모아 보여 준다.
  cover?: CoverArt;
}

export const albums: Album[] = [
  { id: "a1", title: "늦은 오후의 방", artist: "윤슬", year: 2026, tone: "#4a0c10", cover: { pattern: "grooves", ground: "#ff5a3c", figure: "#16090a" } },
  { id: "a2", title: "등대와 우편", artist: "해무", year: 2025, tone: "#132a5e", cover: { pattern: "sun", ground: "#1f3f8f", figure: "#ffd166" } },
  { id: "a3", title: "종이비행기 클럽", artist: "밤산책", year: 2026, tone: "#6e1420", cover: { pattern: "stripes", ground: "#ffd23f", figure: "#d62839" } },
  { id: "a4", title: "느린 회전", artist: "모노레일", year: 2024, tone: "#0b3d39", cover: { pattern: "grid", ground: "#0f766e", figure: "#a7f3d0" } },
  { id: "a5", title: "새벽 세 시의 부엌", artist: "정다운 트리오", year: 2025, tone: "#1a2346", cover: { pattern: "wave", ground: "#16213e", figure: "#ff8fa3" } },
  { id: "a6", title: "신호의 정원", artist: "키와", year: 2026, tone: "#15306f", cover: { pattern: "orbit", ground: "#e8eef2", figure: "#2563eb" } },
  { id: "a7", title: "여름 끝 수영장", artist: "파란물", year: 2025, tone: "#0b4a6b", cover: { pattern: "sun", ground: "#38bdf8", figure: "#ffffff" } },
  { id: "a8", title: "오래된 지도", artist: "한결", year: 2023, tone: "#5c0e0e", cover: { pattern: "stripes", ground: "#c81e1e", figure: "#fde68a" } },
];

// 가사는 처음부터 끝까지 고르게 놓는다. 마지막 줄 뒤는 간주로 남긴다.
function spread(seconds: number, lines: string[], start = 8): LyricLine[] {
  const step = (seconds - start - 20) / lines.length;
  return lines.map((text, index) => ({ at: Math.round(start + index * step), text }));
}

export const tracks: Track[] = [
  {
    id: "t1",
    title: "창문을 여는 법",
    albumId: "a1",
    seconds: 214,
    lyrics: spread(214, [
      "커튼 끝이 바닥을 쓸고 지나가",
      "오후 네 시는 늘 조금 기울어 있어",
      "먼지가 빛 속에서 천천히 떠오를 때",
      "나는 아무것도 하지 않기로 해",
      "창문을 여는 법은 간단해",
      "손잡이를 돌리고 숨을 한 번",
      "바람이 먼저 방을 둘러보고 나면",
      "그제야 나도 들어갈 수 있어",
      "책상 위 식은 차 한 잔",
      "어제 쓰다 만 편지의 첫 줄",
      "괜찮아, 오늘은 거기까지",
      "창문을 여는 법은 간단해",
      "닫는 법을 잊어버리면 돼",
    ]),
  },
  { id: "t2", title: "식탁 위의 볕", albumId: "a1", seconds: 188 },
  { id: "t3", title: "낮잠 이후", albumId: "a1", seconds: 241 },
  { id: "t4", title: "빈 의자", albumId: "a1", seconds: 167 },
  {
    id: "t5",
    title: "등대지기에게",
    albumId: "a2",
    seconds: 236,
    lyrics: spread(236, [
      "파도가 세 번 오고 나면 불이 켜져",
      "누구도 보지 않는 밤에도",
      "당신은 계단을 오르고",
      "나는 그 빛으로 편지를 읽어",
      "우편선은 목요일에 와",
      "젖은 봉투 끝을 말려 두고",
      "보내지 못한 말들은",
      "등대 아래 돌 틈에 끼워 둘게",
      "멀리서 깜박이는 건",
      "아직 여기 있다는 뜻이래",
      "그러니 오늘도 불을 켜 줘",
      "내가 돌아갈 방향을 알 수 있게",
    ]),
  },
  { id: "t6", title: "목요일 우편선", albumId: "a2", seconds: 202 },
  { id: "t7", title: "안개 경보", albumId: "a2", seconds: 259 },
  {
    id: "t8",
    title: "종이비행기 클럽",
    albumId: "a3",
    seconds: 176,
    lyrics: spread(176, [
      "옥상 위에 모인 우리 넷",
      "교과서 맨 뒷장을 찢어",
      "날개 끝을 두 번 접으면",
      "운동장까지는 갈 수 있대",
      "하나 둘 셋에 손을 놓아",
      "바람이 받아 줄 거라고 믿어",
      "떨어져도 다시 접으면 돼",
      "우리 클럽의 규칙은 그것뿐",
      "종이비행기 클럽",
      "회원은 언제나 모집 중",
    ], 6),
  },
  { id: "t9", title: "자전거 뒷자리", albumId: "a3", seconds: 193 },
  { id: "t10", title: "방과 후 라디오", albumId: "a3", seconds: 205 },
  { id: "t11", title: "느린 회전", albumId: "a4", seconds: 274 },
  { id: "t12", title: "환승역", albumId: "a4", seconds: 228 },
  { id: "t13", title: "마지막 열차의 불빛", albumId: "a4", seconds: 251 },
  {
    id: "t14",
    title: "새벽 세 시의 부엌",
    albumId: "a5",
    seconds: 219,
    lyrics: spread(219, [
      "냉장고 불빛만 남은 부엌",
      "물이 끓는 소리를 기다려",
      "잠이 오지 않는 건",
      "오늘이 아직 끝나지 않아서야",
      "토스트 한 장, 버터 조금",
      "창밖 가로등이 하나 꺼지고",
      "누군가도 지금 깨어 있다면",
      "같은 노래를 듣고 있으면 좋겠어",
      "새벽 세 시의 부엌에서",
      "나는 조금 덜 외로워",
    ]),
  },
  { id: "t15", title: "주전자 블루스", albumId: "a5", seconds: 184 },
  { id: "t16", title: "설거지 왈츠", albumId: "a5", seconds: 197 },
  { id: "t17", title: "신호의 정원", albumId: "a6", seconds: 246 },
  { id: "t18", title: "궤도 수리공", albumId: "a6", seconds: 212 },
  { id: "t19", title: "느린 위성", albumId: "a6", seconds: 263 },
  { id: "t20", title: "여름 끝 수영장", albumId: "a7", seconds: 199 },
  { id: "t21", title: "튜브와 오후", albumId: "a7", seconds: 171 },
  { id: "t22", title: "소독약 냄새", albumId: "a7", seconds: 208 },
  { id: "t23", title: "오래된 지도", albumId: "a8", seconds: 232 },
  { id: "t24", title: "접힌 자국", albumId: "a8", seconds: 186 },
  { id: "t25", title: "없는 섬", albumId: "a8", seconds: 254 },
];

export const editorPlaylists: Playlist[] = [
  {
    id: "p-rain",
    title: "비 오는 창가",
    by: "속지 에디터",
    description: "빗소리 사이로 낮게 깔리는 노래. 창문을 조금 열어 두세요.",
    trackIds: ["t1", "t7", "t14", "t3", "t19", "t23", "t6"],
    cover: { pattern: "wave", ground: "#1e293b", figure: "#93c5fd" },
  },
  {
    id: "p-sunday",
    title: "느린 일요일",
    by: "속지 에디터",
    description: "아무 데도 가지 않는 날을 위한 열 곡.",
    trackIds: ["t2", "t21", "t9", "t16", "t4", "t20", "t11", "t15", "t24", "t10"],
    cover: { pattern: "sun", ground: "#ffb703", figure: "#d00000" },
  },
  {
    id: "p-focus",
    title: "집중하는 밤",
    by: "속지 에디터",
    description: "가사가 적고 박자가 고른 곡으로 골랐습니다.",
    trackIds: ["t11", "t17", "t13", "t19", "t12", "t18"],
    cover: { pattern: "grid", ground: "#0b0b0c", figure: "#4ade80" },
  },
];

export const initialMyPlaylists: Playlist[] = [
  { id: "m-dawn", title: "새벽 작업용", by: "나", description: "", trackIds: ["t14", "t11", "t17", "t5", "t13"] },
  { id: "m-commute", title: "출근길 30분", by: "나", description: "", trackIds: ["t8", "t9", "t20", "t1", "t12", "t6", "t22", "t10"] },
  { id: "m-weekend", title: "주말 오후 레코드", by: "나", description: "", trackIds: ["t2", "t3", "t16", "t21"] },
];

// 홈 맨 위 추천 줄. 첫 줄은 많이 들은 곡에서 계산한다.
export const homePicks = [
  { label: "오늘 새로 나온 곡", trackId: "t17" },
  { label: "비 오는 날 추천", trackId: "t5" },
];

export const initialHistory = ["t8", "t1", "t14", "t11", "t5", "t20", "t23"];

export const initialPlayCounts: Record<string, number> = {
  t1: 31, t8: 27, t14: 22, t5: 19, t11: 16, t20: 12, t9: 9, t23: 8, t2: 6, t17: 4,
};

export const initialLiked = ["t1", "t5", "t8", "t14", "t20"];

const trackById = new Map(tracks.map((track) => [track.id, track]));
const albumById = new Map(albums.map((album) => [album.id, album]));

export function getTrack(id: string): Track {
  const track = trackById.get(id);
  if (!track) throw new Error(`없는 곡 ${id}`);
  return track;
}

export function getAlbum(id: string): Album {
  const album = albumById.get(id);
  if (!album) throw new Error(`없는 음반 ${id}`);
  return album;
}

export function albumOf(trackId: string): Album {
  return getAlbum(getTrack(trackId).albumId);
}

export function albumTracks(albumId: string): Track[] {
  return tracks.filter((track) => track.albumId === albumId);
}
