import { useState } from "react";

import { Avatar } from "../components/Avatar";
import { ChevronLeftIcon, MoreIcon } from "../components/Icons";
import { InlineComposer } from "../components/InlineComposer";
import { PostList } from "../components/PostRow";
import { SortMenu } from "../components/SortMenu";
import { sortPosts, type SortMode } from "../content";
import { ME_ID, users, type Community, type Post } from "../data";
import { formatCount } from "../format";

export function CommunityScreen({
  community,
  posts,
  isJoined,
  onToggleJoin,
  onBack,
  onPublish,
}: {
  community: Community;
  posts: Post[];
  isJoined: boolean;
  onToggleJoin: () => void;
  onBack: () => void;
  onPublish: (text: string) => void;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  // 방금 쓴 내 글은 정렬과 상관없이 맨 위에 둬서 올린 직후 바로 보이게 한다.
  const justWritten = posts.filter((post) => post.authorId === ME_ID && post.minutesAgo === 0);
  const others = sortPosts(
    posts.filter((post) => !justWritten.includes(post)),
    sortMode,
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-1 pl-1 pr-3">
        <button type="button" aria-label="뒤로" onClick={onBack} className="grid size-11 place-items-center active:opacity-50">
          <ChevronLeftIcon size={24} strokeWidth={2} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold tracking-[-0.02em]">{community.name}</h1>
        <button
          type="button"
          aria-pressed={isJoined}
          onClick={onToggleJoin}
          className={`hit h-[34px] shrink-0 rounded-[10px] px-4 text-[15px] font-semibold active:opacity-60 ${
            isJoined ? "border border-line-strong text-muted" : "bg-ink text-surface"
          }`}
        >
          {isJoined ? "가입됨" : "가입"}
        </button>
        <button type="button" aria-label="더 보기" className="grid size-11 place-items-center active:opacity-50">
          <MoreIcon size={20} />
        </button>
      </header>
      <div className="scroll-y min-h-0 flex-1">
        <div className="flex h-11 items-center gap-2.5 border-b border-line px-4 text-[14px]">
          <span className="flex">
            {community.memberPreviewIds.map((userId, index) => (
              <span key={userId} className={`rounded-full ring-2 ring-surface ${index > 0 ? "-ml-2" : ""}`}>
                <Avatar user={users[userId]} size={22} />
              </span>
            ))}
          </span>
          <span className="font-semibold">멤버 {formatCount(community.memberCount + (isJoined ? 1 : 0))}명</span>
          <span className="text-muted">{formatCount(community.activeCount)}명 활동 중</span>
        </div>
        <InlineComposer placeholder={`${community.name}에 올리기...`} onSubmit={onPublish} />
        <div className="flex h-12 items-center border-b border-line px-4">
          <SortMenu
            value={sortMode}
            labels={{ popular: "인기 게시물", recent: "최신 게시물" }}
            onChange={setSortMode}
          />
        </div>
        <PostList posts={[...justWritten, ...others]} showCommunity={false} />
        <div className="h-8" />
      </div>
    </div>
  );
}
