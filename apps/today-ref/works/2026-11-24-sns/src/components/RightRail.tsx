// 오른쪽 단: 검색칸과 번호 붙은 인기 주제(r3 Bluesky), 아직 팔로우하지 않은 추천 계정(r6 Kilogram 시안).
import { useState } from "react";

import { useApp } from "../app-context";
import { meId, trends } from "../data";
import { compactCount } from "../format";
import { href, navigate } from "../router";
import { Avatar } from "./Avatar";
import { FollowButton } from "./FollowButton";
import { SearchIcon } from "./Icons";

export function RightRail({ showSearch }: { showSearch: boolean }) {
  return (
    <div className="sticky top-0 flex max-h-dvh flex-col gap-7 overflow-y-auto px-5 py-3 [scrollbar-width:none]">
      {showSearch && <SearchBox />}
      <TrendList />
      <Suggestions />
    </div>
  );
}

function SearchBox() {
  const [query, setQuery] = useState("");
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim()) navigate({ name: "explore", q: query.trim() });
      }}
      className="pt-1"
    >
      <label className="flex h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_1px_var(--accent)]">
        <SearchIcon size={17} className="text-[var(--faint)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="검색"
          aria-label="글, 사람, 주제 검색"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--faint)]"
        />
      </label>
    </form>
  );
}

export function TrendList({ large = false }: { large?: boolean }) {
  return (
    <section>
      <h2 className={`px-1 font-[650] ${large ? "mb-1 text-[17px]" : "mb-1.5 text-[15px]"}`}>인기 주제</h2>
      <ol>
        {trends.map((trend, index) => (
          <li key={trend.tag}>
            <a
              href={href({ name: "explore", q: `#${trend.tag}` })}
              className={`flex items-baseline gap-3 rounded-md px-1 hover:bg-[var(--hover)] ${large ? "py-3" : "py-[7px]"}`}
            >
              <span className="w-4 text-right text-[14px] text-[var(--faint)] tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">#{trend.tag}</span>
                <span className="block text-[14px] text-[var(--muted)]">글 {compactCount(trend.posts)}개</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Suggestions({ large = false }: { large?: boolean }) {
  const { state } = useApp();
  // 처음 그릴 때 팔로우하지 않았던 사람을 고정해 둔다. 팔로우를 눌러도 행이 사라지지 않고 버튼만 바뀐다.
  const [suggested] = useState(() =>
    Object.values(state.users)
      .filter((user) => user.id !== meId && !state.following[user.id])
      .sort((a, b) => b.baseFollowers - a.baseFollowers)
      .slice(0, large ? 6 : 4)
      .map((user) => user.id),
  );

  return (
    <section>
      <h2 className={`mb-1 px-1 font-[650] ${large ? "text-[17px]" : "text-[15px]"}`}>추천</h2>
      <ul>
        {suggested.map((id) => {
          const user = state.users[id];
          return (
            <li key={id} className="flex items-center gap-3 rounded-md px-1 py-2.5">
              <a href={href({ name: "profile", handle: user.handle, tab: "posts" })} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar user={user} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-[650] hover:underline">{user.name}</span>
                  <span className="block truncate text-[14px] text-[var(--muted)]">{large ? user.bio : `@${user.handle}`}</span>
                </span>
              </a>
              <FollowButton userId={id} size="small" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
