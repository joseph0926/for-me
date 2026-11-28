// 재생과 보관함 상태. 대기열, 좋아요, 최근 재생과 재생 횟수가 같은 사건(곡이 시작됨)으로 함께 바뀌므로 한 reducer에 둔다.
import { getTrack, initialHistory, initialLiked, initialMyPlaylists, initialPlayCounts, type Playlist } from "./data";

export type Repeat = "off" | "all" | "one";

// 같은 곡을 대기열에 두 번 담을 수 있어 곡 id와 따로 항목 key를 둔다.
export interface QueueItem {
  key: string;
  trackId: string;
}

export interface MusicState {
  queue: QueueItem[];
  index: number;
  playing: boolean;
  position: number;
  shuffle: boolean;
  // 셔플을 켜기 전 다음 곡 순서. 끄면 이 순서로 돌아간다.
  beforeShuffle: string[] | null;
  repeat: Repeat;
  // 지금 대기열을 만든 목록(음반, 플레이리스트, 보관함 묶음)의 id. 그 목록의 큰 재생 버튼이 일시정지로 바뀐다.
  sourceId: string | null;
  liked: string[];
  history: string[];
  playCounts: Record<string, number>;
  myPlaylists: Playlist[];
  nextKey: number;
}

export type MusicAction =
  | { type: "play"; trackIds: string[]; start: number; shuffle: boolean; sourceId: string | null }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "seek"; position: number }
  | { type: "tick"; seconds: number }
  // 셔플을 켤 때 다음 곡들의 새 순서(항목 key). 끌 때는 쓰지 않는다.
  | { type: "shuffle"; upcomingKeys: string[] }
  | { type: "repeat" }
  | { type: "reorder"; upcoming: QueueItem[] }
  | { type: "clearUpcoming" }
  | { type: "jump"; index: number }
  | { type: "playNext"; trackId: string }
  | { type: "addToEnd"; trackId: string }
  | { type: "like"; trackId: string }
  | { type: "createPlaylist"; id: string; title: string }
  | { type: "addToPlaylist"; playlistId: string; trackId: string };

// 앞의 곡을 다시 시작할지, 이전 곡으로 갈지 가르는 기준. 대부분의 음악 앱이 몇 초 안쪽에서만 이전 곡으로 간다.
const restartAfterSeconds = 3;

export const initialMusic: MusicState = {
  queue: [
    { key: "q0", trackId: "t1" },
    { key: "q1", trackId: "t2" },
    { key: "q2", trackId: "t3" },
    { key: "q3", trackId: "t4" },
  ],
  index: 0,
  playing: false,
  position: 52,
  shuffle: false,
  beforeShuffle: null,
  repeat: "off",
  sourceId: "a1",
  liked: initialLiked,
  history: initialHistory,
  playCounts: initialPlayCounts,
  myPlaylists: initialMyPlaylists,
  nextKey: 4,
};

export function currentTrackId(state: MusicState): string | null {
  return state.queue[state.index]?.trackId ?? null;
}

function toItems(state: MusicState, trackIds: string[]): { items: QueueItem[]; nextKey: number } {
  const items = trackIds.map((trackId, offset) => ({ key: `q${state.nextKey + offset}`, trackId }));
  return { items, nextKey: state.nextKey + trackIds.length };
}

// 곡이 새로 시작될 때 최근 재생과 재생 횟수를 함께 남긴다.
function startAt(state: MusicState, index: number, playing = true): MusicState {
  const trackId = state.queue[index]?.trackId;
  if (!trackId) return { ...state, playing: false, position: 0 };
  return {
    ...state,
    index,
    playing,
    position: 0,
    history: [trackId, ...state.history.filter((id) => id !== trackId)].slice(0, 30),
    playCounts: { ...state.playCounts, [trackId]: (state.playCounts[trackId] ?? 0) + 1 },
  };
}

function advance(state: MusicState, wrap: boolean): MusicState {
  const last = state.queue.length - 1;
  if (state.index < last) return startAt(state, state.index + 1);
  if (wrap) return startAt(state, 0);
  // 끝까지 들었으면 마지막 곡의 처음에서 멈춘다.
  return { ...state, playing: false, position: 0 };
}

export function musicReducer(state: MusicState, action: MusicAction): MusicState {
  switch (action.type) {
    case "play": {
      const { items, nextKey } = toItems(state, action.trackIds);
      const next = { ...state, queue: items, nextKey, shuffle: action.shuffle, beforeShuffle: null, sourceId: action.sourceId };
      return startAt(next, action.start);
    }
    case "toggle":
      if (state.queue.length === 0) return state;
      return { ...state, playing: !state.playing };
    case "next":
      // 직접 넘길 때는 한 곡 반복이어도 다음 곡으로 가고, 반복이 켜져 있으면 처음으로 돌아간다.
      return advance(state, state.repeat !== "off");
    case "prev":
      if (state.position > restartAfterSeconds || state.index === 0) return { ...state, position: 0 };
      return startAt(state, state.index - 1, state.playing);
    case "seek":
      return { ...state, position: action.position };
    case "tick": {
      const trackId = currentTrackId(state);
      if (!trackId || !state.playing) return state;
      const position = state.position + action.seconds;
      if (position < getTrack(trackId).seconds) return { ...state, position };
      if (state.repeat === "one") return startAt(state, state.index);
      return advance(state, state.repeat === "all");
    }
    case "shuffle": {
      const upcoming = state.queue.slice(state.index + 1);
      const played = state.queue.slice(0, state.index + 1);
      if (!state.shuffle) {
        const order = action.upcomingKeys;
        const mixed = [...upcoming].sort((a, b) => rank(order, a.key) - rank(order, b.key));
        return { ...state, shuffle: true, beforeShuffle: upcoming.map((item) => item.key), queue: [...played, ...mixed] };
      }
      // 셔플 전 순서를 되살리고, 셔플 중에 새로 담은 곡은 뒤에 붙인다.
      const order = state.beforeShuffle ?? [];
      const restored = [...upcoming].sort((a, b) => rank(order, a.key) - rank(order, b.key));
      return { ...state, shuffle: false, beforeShuffle: null, queue: [...played, ...restored] };
    }
    case "repeat":
      return { ...state, repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off" };
    case "reorder":
      return { ...state, queue: [...state.queue.slice(0, state.index + 1), ...action.upcoming] };
    case "clearUpcoming":
      return { ...state, queue: state.queue.slice(0, state.index + 1), beforeShuffle: null, sourceId: null };
    case "jump":
      return startAt(state, action.index);
    case "playNext":
    case "addToEnd": {
      if (state.queue.length === 0) return musicReducer(state, { type: "play", trackIds: [action.trackId], start: 0, shuffle: false, sourceId: null });
      const { items, nextKey } = toItems(state, [action.trackId]);
      const at = action.type === "playNext" ? state.index + 1 : state.queue.length;
      const queue = [...state.queue.slice(0, at), ...items, ...state.queue.slice(at)];
      // 담은 뒤의 대기열은 더 이상 원래 목록과 같지 않다.
      return { ...state, queue, nextKey, sourceId: null };
    }
    case "like": {
      const liked = state.liked.includes(action.trackId)
        ? state.liked.filter((id) => id !== action.trackId)
        : [action.trackId, ...state.liked];
      return { ...state, liked };
    }
    case "createPlaylist":
      return {
        ...state,
        myPlaylists: [{ id: action.id, title: action.title, by: "나", description: "", trackIds: [] }, ...state.myPlaylists],
      };
    case "addToPlaylist":
      return {
        ...state,
        myPlaylists: state.myPlaylists.map((playlist) =>
          playlist.id === action.playlistId && !playlist.trackIds.includes(action.trackId)
            ? { ...playlist, trackIds: [...playlist.trackIds, action.trackId] }
            : playlist,
        ),
      };
  }
}

function rank(order: string[], key: string): number {
  const at = order.indexOf(key);
  return at === -1 ? Number.MAX_SAFE_INTEGER : at;
}

// 셔플 순서는 이벤트 핸들러에서 정해 넘긴다. reducer는 같은 입력에 같은 결과를 내야 하기 때문이다.
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
