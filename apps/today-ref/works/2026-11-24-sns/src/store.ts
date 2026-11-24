// 앱 전체가 함께 바꾸는 상태. 화면에 보이는 숫자는 저장하지 않고 기본 수와 내가 누른 상태에서 계산한다.
import {
  incomingPosts,
  initialFollowing,
  meId,
  posts as seedPosts,
  reposts as seedReposts,
  users as seedUsers,
  type Photo,
  type Post,
  type User,
} from "./data";

export interface StoredPost extends Omit<Post, "minutesAgo"> {
  createdAt: number;
}

export interface FeedRepost {
  userId: string;
  postId: string;
  at: number;
}

export type NotificationKind = "like" | "repost" | "follow" | "reply";

export interface Notification {
  id: string;
  kind: NotificationKind;
  // 같은 글에 같은 반응을 한 사람은 한 행으로 묶는다. 맨 앞이 가장 최근.
  actorIds: string[];
  postId?: string;
  at: number;
}

// 글 id에서 누른 시각으로. 저장함과 내 프로필의 재게시는 이 시각 순서로 보인다.
type Flags = Record<string, number>;

export interface State {
  users: Record<string, User>;
  posts: Record<string, StoredPost>;
  reposts: FeedRepost[];
  // 들어왔지만 아직 피드에 붙이지 않은 새 글.
  pending: StoredPost[];
  liked: Flags;
  reposted: Flags;
  saved: Flags;
  following: Record<string, true>;
  notifications: Notification[];
  notificationsSeenAt: number;
  // 흉내 낸 실시간 이벤트를 몇 번째까지 보냈는지.
  simulated: number;
}

const minute = 60_000;

export function createInitialState(now: number): State {
  const ago = (minutes: number) => now - minutes * minute;
  const posts: Record<string, StoredPost> = {};
  for (const { minutesAgo, ...post } of seedPosts) posts[post.id] = { ...post, createdAt: ago(minutesAgo) };

  return {
    users: Object.fromEntries(seedUsers.map((user) => [user.id, user])),
    posts,
    reposts: seedReposts.map(({ minutesAgo, ...repost }) => ({ ...repost, at: ago(minutesAgo) })),
    pending: [],
    liked: { "p-dubu": ago(200), "p-bookclub": ago(70) },
    reposted: {},
    saved: { "p-strawberry": ago(125) },
    following: Object.fromEntries(initialFollowing.map((id) => [id, true as const])),
    notifications: [
      { id: "nt-1", kind: "reply", actorIds: ["narae"], postId: "r-pour-2", at: ago(9) },
      { id: "nt-2", kind: "reply", actorIds: ["jiwoo"], postId: "r-book-2", at: ago(64) },
      { id: "nt-3", kind: "like", actorIds: ["jiwoo", "doyun", "minho", "woojin"], postId: "p-me-walk", at: ago(140) },
      { id: "nt-4", kind: "follow", actorIds: ["woojin"], at: ago(60 * 6) },
      { id: "nt-5", kind: "repost", actorIds: ["jiwoo"], postId: "p-me-book", at: ago(60 * 30) },
      { id: "nt-6", kind: "like", actorIds: ["serin", "narae"], postId: "p-me-book", at: ago(60 * 48) },
    ],
    // 처음 열 때는 최근 두 시간의 알림을 아직 보지 않은 것으로 둔다.
    notificationsSeenAt: ago(120),
    simulated: 0,
  };
}

export type Action =
  | { type: "toggle"; flag: "liked" | "reposted" | "saved"; postId: string; at: number }
  | { type: "toggleFollow"; userId: string }
  | { type: "publish"; post: StoredPost }
  | { type: "remove"; postId: string }
  | { type: "restore"; post: StoredPost }
  | { type: "showPending" }
  | { type: "seeNotifications"; at: number }
  | { type: "simulate"; at: number };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggle": {
      const flags = { ...state[action.flag] };
      if (flags[action.postId]) delete flags[action.postId];
      else flags[action.postId] = action.at;
      return { ...state, [action.flag]: flags };
    }
    case "toggleFollow": {
      const following = { ...state.following };
      if (following[action.userId]) delete following[action.userId];
      else following[action.userId] = true;
      return { ...state, following };
    }
    case "publish":
      return { ...state, posts: { ...state.posts, [action.post.id]: action.post } };
    case "remove": {
      const posts = { ...state.posts };
      delete posts[action.postId];
      return { ...state, posts };
    }
    case "restore":
      return { ...state, posts: { ...state.posts, [action.post.id]: action.post } };
    case "showPending": {
      const posts = { ...state.posts };
      for (const post of state.pending) posts[post.id] = post;
      return { ...state, posts, pending: [] };
    }
    case "seeNotifications":
      return action.at > state.notificationsSeenAt ? { ...state, notificationsSeenAt: action.at } : state;
    case "simulate":
      return simulate(state, action.at);
  }
}

// 열어 둔 동안 들어오는 새 글과 내 글에 대한 반응. 차례대로 한 번씩만 일어난다.
const script: ({ kind: "post"; index: number } | { kind: NotificationKind; actorId: string; postId?: string })[] = [
  { kind: "post", index: 0 },
  { kind: "like", actorId: "yuna", postId: "p-me-walk" },
  { kind: "post", index: 1 },
  { kind: "follow", actorId: "narae" },
  { kind: "post", index: 2 },
  { kind: "like", actorId: "taeo", postId: "p-me-book" },
  { kind: "post", index: 3 },
];

export const simulationLength = script.length;

function simulate(state: State, at: number): State {
  const step = script[state.simulated];
  if (!step) return state;
  const next = { ...state, simulated: state.simulated + 1 };

  if (step.kind === "post") {
    const post = incomingPosts[step.index];
    return { ...next, pending: [{ ...post, createdAt: at }, ...state.pending] };
  }

  // 같은 글에 같은 반응이 이미 있으면 그 행 맨 앞에 사람을 더하고 시각을 새로 한다.
  const existing = state.notifications.find((item) => item.kind === step.kind && item.postId === step.postId && step.kind !== "follow");
  if (existing) {
    const merged: Notification = { ...existing, actorIds: [step.actorId, ...existing.actorIds.filter((id) => id !== step.actorId)], at };
    return { ...next, notifications: [merged, ...state.notifications.filter((item) => item.id !== existing.id)] };
  }
  const created: Notification = { id: `nt-sim-${state.simulated}`, kind: step.kind, actorIds: [step.actorId], postId: step.postId, at };
  return { ...next, notifications: [created, ...state.notifications] };
}

// 화면에 보이는 수.
export function counts(state: State, post: StoredPost) {
  // 답글 수는 답글에 달린 답글까지 센다. 상세에서 보이는 답글 줄기 전체와 같은 수다.
  const all = Object.values(state.posts);
  let replies = 0;
  const queue = [post.id];
  while (queue.length > 0) {
    const parentId = queue.shift();
    for (const item of all) {
      if (item.replyToId !== parentId) continue;
      replies += 1;
      queue.push(item.id);
    }
  }
  return {
    likes: post.baseLikes + (state.liked[post.id] ? 1 : 0),
    reposts: post.baseReposts + (state.reposted[post.id] ? 1 : 0),
    replies: post.baseReplies + replies,
    saves: post.baseSaves + (state.saved[post.id] ? 1 : 0),
  };
}

export function followerCount(state: State, user: User) {
  return user.baseFollowers + (state.following[user.id] ? 1 : 0);
}

export function followingCount(state: State, user: User) {
  return user.id === meId ? Object.keys(state.following).length : user.followingCount;
}

export function unreadNotifications(state: State) {
  return state.notifications.filter((item) => item.at > state.notificationsSeenAt).length;
}

export type FeedId = "for-you" | "following" | "photos" | "books";

export interface FeedItem {
  key: string;
  post: StoredPost;
  repostedBy?: string;
  at: number;
}

const topLevel = (state: State) => Object.values(state.posts).filter((post) => !post.replyToId);
const hasTag = (post: StoredPost, tag: string) => post.text.includes(`#${tag}`);
const byNewest = (a: FeedItem, b: FeedItem) => b.at - a.at;
const asItem = (post: StoredPost): FeedItem => ({ key: post.id, post, at: post.createdAt });

export function feed(state: State, id: FeedId): FeedItem[] {
  if (id === "following") {
    const followed = (userId: string) => userId === meId || Boolean(state.following[userId]);
    const own = topLevel(state).filter((post) => followed(post.authorId)).map(asItem);
    const shared = state.reposts
      .filter((repost) => followed(repost.userId) && state.posts[repost.postId])
      .map((repost) => ({ key: `${repost.userId}:${repost.postId}`, post: state.posts[repost.postId], repostedBy: repost.userId, at: repost.at }));
    return [...own, ...shared].sort(byNewest);
  }
  if (id === "photos") return topLevel(state).filter((post) => post.photos.length > 0 || hasTag(post, "사진")).map(asItem).sort(byNewest);
  if (id === "books") return topLevel(state).filter((post) => hasTag(post, "책") || hasTag(post, "독서모임")).map(asItem).sort(byNewest);
  return topLevel(state).map(asItem).sort(byNewest);
}

// 글 상세의 위쪽 맥락(답글이 달린 글들)과 아래 답글.
export function ancestors(state: State, post: StoredPost): StoredPost[] {
  const chain: StoredPost[] = [];
  let parent = post.replyToId ? state.posts[post.replyToId] : undefined;
  while (parent) {
    chain.unshift(parent);
    parent = parent.replyToId ? state.posts[parent.replyToId] : undefined;
  }
  return chain;
}

export interface ReplyThread {
  root: StoredPost;
  // 답글에 달린 첫 답글을 차례로 이어 붙인 줄기. 상세에서 아바타 사이를 세로선으로 잇는다.
  chain: StoredPost[];
}

export function replyThreads(state: State, post: StoredPost): ReplyThread[] {
  const repliesTo = (id: string) =>
    Object.values(state.posts)
      .filter((item) => item.replyToId === id)
      .sort((a, b) => a.createdAt - b.createdAt);

  return repliesTo(post.id).map((root) => {
    const chain: StoredPost[] = [];
    let current = root;
    for (;;) {
      const next = repliesTo(current.id)[0];
      if (!next) break;
      chain.push(next);
      current = next;
    }
    return { root, chain };
  });
}

export function newPostId() {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export type { Photo };
