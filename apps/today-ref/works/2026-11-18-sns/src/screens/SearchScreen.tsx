import { useState } from "react";

import { Avatar } from "../components/Avatar";
import { FollowButton, LargeTitle } from "../components/Chrome";
import { CloseIcon, SearchIcon, VerifiedBadge } from "../components/Icons";
import { PostList } from "../components/PostRow";
import { suggestedUserIds, users, type Post, type User } from "../data";
import { formatCount } from "../format";

export function SearchScreen({
  posts,
  followingIds,
  onToggleFollow,
}: {
  posts: Post[];
  followingIds: string[];
  onToggleFollow: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  const suggestedUsers = suggestedUserIds.map((id) => users[id]);
  const matchedUsers = keyword
    ? suggestedUsers.filter((user) => user.handle.includes(keyword) || user.name.includes(keyword))
    : [];
  const matchedPosts = keyword ? posts.filter((post) => post.text.toLowerCase().includes(keyword)) : [];
  const hasNoResult = keyword !== "" && matchedUsers.length === 0 && matchedPosts.length === 0;

  const renderUser = (user: User) => (
    <UserRow
      key={user.id}
      user={user}
      isFollowing={followingIds.includes(user.id)}
      onToggleFollow={() => onToggleFollow(user.id)}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 pb-2">
        <LargeTitle>검색</LargeTitle>
        <div className="px-4">
          <label className="flex h-10 items-center gap-2 rounded-[12px] bg-fill px-3 text-muted">
            <SearchIcon size={18} strokeWidth={2} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="검색"
              aria-label="검색어"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" aria-label="검색어 지우기" onClick={() => setQuery("")} className="hit -mr-1 grid size-6 place-items-center">
                <span className="grid size-[18px] place-items-center rounded-full bg-faint text-surface">
                  <CloseIcon size={11} strokeWidth={3} />
                </span>
              </button>
            )}
          </label>
        </div>
      </div>
      <div className="scroll-y min-h-0 flex-1">
        {keyword === "" && (
          <section>
            <h2 className="px-4 pb-1 pt-3 text-[15px] font-semibold text-muted">팔로우 추천</h2>
            {suggestedUsers.map(renderUser)}
          </section>
        )}
        {matchedUsers.length > 0 && <section className="border-b border-line pb-1">{matchedUsers.slice(0, 3).map(renderUser)}</section>}
        {matchedPosts.length > 0 && <PostList posts={matchedPosts} />}
        {hasNoResult && <p className="px-8 py-16 text-center text-[15px] text-muted">'{query.trim()}'에 대한 결과가 없어요</p>}
        <div className="h-8" />
      </div>
    </div>
  );
}

function UserRow({ user, isFollowing, onToggleFollow }: { user: User; isFollowing: boolean; onToggleFollow: () => void }) {
  return (
    <div className="flex gap-3 pl-4 pt-3">
      <Avatar user={user} size={36} />
      <div className="flex min-w-0 flex-1 items-start gap-3 border-b border-line pb-3 pr-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[15px] font-semibold leading-[20px]">
            <span className="truncate">{user.handle}</span>
            {user.verified && <VerifiedBadge />}
          </p>
          <p className="text-[15px] leading-[20px] text-muted">{user.name}</p>
          <p className="mt-1.5 text-[15px] leading-[20px]">팔로워 {formatCount(user.followerCount)}명</p>
        </div>
        <FollowButton isFollowing={isFollowing} onToggle={onToggleFollow} />
      </div>
    </div>
  );
}
