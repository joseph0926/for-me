import { createContext, useContext } from "react";

// 글 줄은 홈, 검색, 프로필, 커뮤니티, 상세 어디에나 놓이므로 반응과 이동 동작을 context로 받는다.
export type PostActions = {
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  vote: (postId: string, optionId: string) => void;
  share: (postId: string) => void;
  openPost: (postId: string, focusReply?: boolean) => void;
  openCommunity: (communityId: string) => void;
};

export const PostActionsContext = createContext<PostActions | null>(null);

export function usePostActions(): PostActions {
  const actions = useContext(PostActionsContext);
  if (!actions) throw new Error("PostActionsContext 안에서만 쓸 수 있습니다");
  return actions;
}

// 답글 수는 저장하지 않고 전체 글 목록에서 센 값을 내려 준다.
export const ReplyCountsContext = createContext<ReadonlyMap<string, number>>(new Map());

export function useReplyCount(postId: string): number {
  return useContext(ReplyCountsContext).get(postId) ?? 0;
}
