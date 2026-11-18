import { initialFollowingIds, initialPosts, ME_ID, type Post } from "./data";

// 글, 팔로우, 커뮤니티 가입처럼 서버가 가졌을 상태를 메모리에서 관리한다.
export type ContentState = {
  posts: Post[];
  followingIds: string[];
  joinedCommunityIds: string[];
};

export type ContentAction =
  | { type: "toggleLike"; postId: string }
  | { type: "toggleRepost"; postId: string }
  | { type: "vote"; postId: string; optionId: string }
  | { type: "publish"; post: Post }
  | { type: "toggleFollow"; userId: string }
  | { type: "toggleJoin"; communityId: string };

export const initialContent: ContentState = {
  posts: initialPosts,
  followingIds: initialFollowingIds,
  joinedCommunityIds: [],
};

function updatePost(posts: Post[], postId: string, update: (post: Post) => Post): Post[] {
  return posts.map((post) => (post.id === postId ? update(post) : post));
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

export function contentReducer(state: ContentState, action: ContentAction): ContentState {
  switch (action.type) {
    case "toggleLike":
      return {
        ...state,
        posts: updatePost(state.posts, action.postId, (post) => ({
          ...post,
          liked: !post.liked,
          likeCount: post.likeCount + (post.liked ? -1 : 1),
        })),
      };
    case "toggleRepost":
      return {
        ...state,
        posts: updatePost(state.posts, action.postId, (post) => ({
          ...post,
          reposted: !post.reposted,
          repostCount: post.repostCount + (post.reposted ? -1 : 1),
        })),
      };
    case "vote":
      return {
        ...state,
        posts: updatePost(state.posts, action.postId, (post) => {
          // 투표는 한 번만 할 수 있다.
          if (!post.poll || post.poll.votedOptionId !== null) return post;
          return {
            ...post,
            poll: {
              ...post.poll,
              votedOptionId: action.optionId,
              options: post.poll.options.map((option) =>
                option.id === action.optionId ? { ...option, votes: option.votes + 1 } : option,
              ),
            },
          };
        }),
      };
    case "publish":
      return { ...state, posts: [action.post, ...state.posts] };
    case "toggleFollow":
      return { ...state, followingIds: toggleId(state.followingIds, action.userId) };
    case "toggleJoin":
      return { ...state, joinedCommunityIds: toggleId(state.joinedCommunityIds, action.communityId) };
  }
}

let localPostCount = 0;

export function createMyPost(fields: { text: string; parentId?: string; communityId?: string }): Post {
  localPostCount += 1;
  return {
    id: `local-${localPostCount}`,
    authorId: ME_ID,
    minutesAgo: 0,
    text: fields.text,
    scenes: [],
    poll: null,
    communityId: fields.communityId ?? null,
    parentId: fields.parentId ?? null,
    likeCount: 0,
    liked: false,
    repostCount: 0,
    reposted: false,
    shareCount: 0,
  };
}

export function countReplies(posts: Post[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (post.parentId !== null) counts.set(post.parentId, (counts.get(post.parentId) ?? 0) + 1);
  }
  return counts;
}

export type SortMode = "popular" | "recent";

export function sortPosts(posts: Post[], mode: SortMode): Post[] {
  return mode === "popular"
    ? [...posts].sort((a, b) => b.likeCount - a.likeCount)
    : [...posts].sort((a, b) => a.minutesAgo - b.minutesAgo);
}
