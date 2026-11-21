import {
  BOOT_TIME,
  ME,
  TIER_ORDER,
  creatorReplies,
  creators,
  fans,
  initialComments,
  initialNotifications,
  initialPosts,
  type Comment,
  type Creator,
  type FanUser,
  type Notification,
  type Post,
  type TierId,
  type Visibility,
} from "./data";

// 크리에이터의 답글은 내가 팬 글을 올린 뒤 이 시간만큼 지나 도착한다.
export const CREATOR_REPLY_DELAY_MS = 6_000;

export type PendingReply = { postId: string; creatorId: string; dueAt: number };

export type AppState = {
  subscriptions: string[];
  // 유료 등급만 둔다. 없으면 팔로우 또는 미구독이다.
  memberships: Record<string, Exclude<TierId, "follow">>;
  posts: Post[];
  comments: Comment[];
  likedPosts: string[];
  likedComments: string[];
  reminders: string[];
  notifications: Notification[];
  readNotifications: string[];
  // 크리에이터 홈을 마지막으로 연 시각. 그 뒤에 올라온 크리에이터 글이 있으면 새 소식 점을 띄운다.
  lastVisited: Record<string, number>;
  scheduleSeen: string[];
  pendingReplies: PendingReply[];
};

export type AppAction =
  | { type: "toggleSubscribe"; creatorId: string }
  | { type: "join"; creatorId: string; tier: Exclude<TierId, "follow"> }
  | { type: "cancelMembership"; creatorId: string }
  | { type: "toggleLikePost"; postId: string }
  | { type: "toggleLikeComment"; commentId: string }
  | { type: "addComment"; comment: Comment }
  | { type: "addFanPost"; post: Post; replyDueAt: number }
  | { type: "deliverReply"; postId: string; at: number }
  | { type: "toggleReminder"; eventId: string }
  | { type: "readNotification"; id: string }
  | { type: "readAllNotifications" }
  | { type: "visitCreator"; creatorId: string; at: number }
  | { type: "seeSchedule"; creatorId: string };

export const initialState: AppState = {
  subscriptions: ["yoonseul", "lateSummer", "doyo"],
  memberships: { yoonseul: "member" },
  posts: initialPosts,
  comments: initialComments,
  likedPosts: [],
  likedComments: [],
  reminders: [],
  notifications: initialNotifications,
  readNotifications: ["nt3"],
  lastVisited: { doyo: BOOT_TIME },
  scheduleSeen: [],
  pendingReplies: [],
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "toggleSubscribe": {
      // 유료 멤버는 구독 취소 전에 멤버십부터 해지해야 하므로 화면에서 이 동작을 막는다.
      if (state.memberships[action.creatorId]) return state;
      return { ...state, subscriptions: toggle(state.subscriptions, action.creatorId) };
    }
    case "join":
      return {
        ...state,
        memberships: { ...state.memberships, [action.creatorId]: action.tier },
        subscriptions: state.subscriptions.includes(action.creatorId)
          ? state.subscriptions
          : [...state.subscriptions, action.creatorId],
      };
    case "cancelMembership": {
      const { [action.creatorId]: _cancelled, ...rest } = state.memberships;
      return { ...state, memberships: rest };
    }
    case "toggleLikePost":
      return { ...state, likedPosts: toggle(state.likedPosts, action.postId) };
    case "toggleLikeComment":
      return { ...state, likedComments: toggle(state.likedComments, action.commentId) };
    case "addComment":
      return { ...state, comments: [...state.comments, action.comment] };
    case "addFanPost":
      return {
        ...state,
        posts: [action.post, ...state.posts],
        pendingReplies: [
          ...state.pendingReplies,
          { postId: action.post.id, creatorId: action.post.creatorId, dueAt: action.replyDueAt },
        ],
      };
    case "deliverReply": {
      const pending = state.pendingReplies.find((item) => item.postId === action.postId);
      if (!pending) return state;
      const creator = creatorById(pending.creatorId);
      const reply: Comment = {
        id: `reply-${pending.postId}`,
        postId: pending.postId,
        author: { kind: "creator", creatorId: pending.creatorId },
        createdAt: action.at,
        body: creatorReplies[pending.creatorId] ?? "고마워요!",
        likes: 0,
      };
      const notification: Notification = {
        id: `nt-reply-${pending.postId}`,
        kind: "creator-comment",
        creatorId: pending.creatorId,
        text: `${creator.name} 님이 내 팬 글에 댓글을 남겼어요`,
        createdAt: action.at,
        target: { name: "post", postId: pending.postId },
      };
      return {
        ...state,
        comments: [...state.comments, reply],
        notifications: [notification, ...state.notifications],
        pendingReplies: state.pendingReplies.filter((item) => item.postId !== action.postId),
      };
    }
    case "toggleReminder":
      return { ...state, reminders: toggle(state.reminders, action.eventId) };
    case "readNotification":
      if (state.readNotifications.includes(action.id)) return state;
      return { ...state, readNotifications: [...state.readNotifications, action.id] };
    case "readAllNotifications":
      return { ...state, readNotifications: state.notifications.map((item) => item.id) };
    case "visitCreator":
      return { ...state, lastVisited: { ...state.lastVisited, [action.creatorId]: action.at } };
    case "seeSchedule":
      if (state.scheduleSeen.includes(action.creatorId)) return state;
      return { ...state, scheduleSeen: [...state.scheduleSeen, action.creatorId] };
  }
}

export function creatorById(id: string): Creator {
  const creator = creators.find((item) => item.id === id);
  if (!creator) throw new Error(`크리에이터 ${id}가 없습니다`);
  return creator;
}

export function fanById(id: string): FanUser {
  const fan = fans.find((item) => item.id === id);
  if (!fan) throw new Error(`팬 ${id}가 없습니다`);
  return fan;
}

export function tierOf(state: AppState, creatorId: string): TierId | null {
  const paid = state.memberships[creatorId];
  if (paid) return paid;
  return state.subscriptions.includes(creatorId) ? "follow" : null;
}

const requiredTier: Record<Visibility, TierId | null> = { public: null, member: "member", close: "close" };

export function canView(state: AppState, post: Post): boolean {
  const required = requiredTier[post.visibility];
  if (required === null) return true;
  const tier = tierOf(state, post.creatorId);
  return tier !== null && TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required);
}

export function commentsOf(state: AppState, postId: string): Comment[] {
  return state.comments.filter((comment) => comment.postId === postId);
}

export function postLikes(state: AppState, post: Post): number {
  return post.likes + (state.likedPosts.includes(post.id) ? 1 : 0);
}

export function commentLikes(state: AppState, comment: Comment): number {
  return comment.likes + (state.likedComments.includes(comment.id) ? 1 : 0);
}

export function hasNewFrom(state: AppState, creatorId: string): boolean {
  const visited = state.lastVisited[creatorId] ?? 0;
  return state.posts.some(
    (post) => post.creatorId === creatorId && post.author.kind === "creator" && post.createdAt > visited,
  );
}

export function isMine(post: Post): boolean {
  return post.author.kind === "fan" && post.author.fanId === ME.id;
}
