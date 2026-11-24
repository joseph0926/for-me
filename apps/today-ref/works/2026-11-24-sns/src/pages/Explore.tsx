// 둘러보기: 검색칸. 비어 있으면 인기 주제와 추천 계정을, 입력하면 맞는 사람과 글을 보인다.
import { useApp } from "../app-context";
import { Avatar } from "../components/Avatar";
import { FollowButton } from "../components/FollowButton";
import { SearchIcon, CloseIcon } from "../components/Icons";
import { PageHeader } from "../components/PageHeader";
import { PostItem } from "../components/PostItem";
import { Suggestions, TrendList } from "../components/RightRail";
import { meId } from "../data";
import { href, navigate } from "../router";

export function Explore({ q }: { q: string }) {
  const { state } = useApp();
  const query = q.trim().toLowerCase();

  // 주소를 바꾸지 않고 덮어써서, 한 글자마다 뒤로 가기 기록이 쌓이지 않게 한다.
  const setQuery = (value: string) => navigate({ name: "explore", q: value }, { replace: true });

  const people = query
    ? Object.values(state.users).filter(
        (user) => user.id !== meId && (user.name.toLowerCase().includes(query) || user.handle.includes(query.replace(/^@/, ""))),
      )
    : [];
  const posts = query
    ? Object.values(state.posts)
        .filter((post) => post.text.toLowerCase().includes(query))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  return (
    <>
      <PageHeader title="둘러보기">
        <div className="px-4 pb-3">
          <label className="flex h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_1px_var(--accent)]">
            <SearchIcon size={17} className="text-[var(--faint)]" />
            <input
              value={q}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="글, 사람, #주제 검색"
              aria-label="검색"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--faint)]"
            />
            {q && (
              <button type="button" aria-label="검색어 지우기" onClick={() => setQuery("")} className="grid size-7 place-items-center rounded-md text-[var(--faint)] hover:bg-[var(--hover)]">
                <CloseIcon size={14} />
              </button>
            )}
          </label>
        </div>
      </PageHeader>

      {!query && (
        <div className="flex flex-col gap-7 px-3 pt-3 pb-8">
          <TrendList large />
          <Suggestions large />
        </div>
      )}

      {query && people.length > 0 && (
        <section className="border-b border-[var(--line)] pb-2">
          <h2 className="px-4 pt-4 pb-1 text-[15px] font-[650]">사람</h2>
          {people.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-2.5">
              <a href={href({ name: "profile", handle: user.handle, tab: "posts" })} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar user={user} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-[650]">{user.name}</span>
                  <span className="block truncate text-[14px] text-[var(--muted)]">{user.bio}</span>
                </span>
              </a>
              <FollowButton userId={user.id} size="small" />
            </div>
          ))}
        </section>
      )}

      {query && (
        <section>
          <h2 className="px-4 pt-4 pb-1 text-[15px] font-[650]">글 {posts.length}개</h2>
          {posts.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
          {posts.length === 0 && people.length === 0 && (
            <p className="px-4 py-16 text-center text-[15px] text-[var(--muted)]">'{q.trim()}'와 맞는 글과 사람이 없어요</p>
          )}
        </section>
      )}
    </>
  );
}
