// 글 상세(r3 Bluesky): 위쪽 맥락 글, 크게 쓴 본문과 전체 시각, 반응 합계 줄, 큰 아이콘 줄, 답글 줄기.
import { useApp } from "../app-context";
import { Avatar } from "../components/Avatar";
import { FollowButton } from "../components/FollowButton";
import { PageHeader } from "../components/PageHeader";
import { PhotoGrid } from "../components/PhotoGrid";
import { PostActions } from "../components/PostActions";
import { PostItem } from "../components/PostItem";
import { RichText } from "../components/RichText";
import { RollingNumber } from "../components/RollingNumber";
import { meId } from "../data";
import { fullTime } from "../format";
import { goBack } from "../history";
import { href } from "../router";
import { ancestors, counts, replyThreads } from "../store";

export function PostDetail({ id }: { id: string }) {
  const { state, openComposer } = useApp();
  const post = state.posts[id];

  if (!post) {
    return (
      <>
        <PageHeader title="게시물" back />
        <div className="px-4 py-16 text-center">
          <p className="text-[15px] text-[var(--muted)]">지워졌거나 없는 글이에요</p>
          <a href="#/" className="mt-3 inline-block text-[14px] text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]">
            홈으로
          </a>
        </div>
      </>
    );
  }

  const author = state.users[post.authorId];
  const number = counts(state, post);
  const above = ancestors(state, post);
  const threads = replyThreads(state, post);
  const me = state.users[meId];

  return (
    <>
      <PageHeader title="게시물" back />

      {above.map((item) => (
        <PostItem key={item.id} post={item} showReplyContext={false} threadBelow divider={false} />
      ))}

      <article className="border-b border-[var(--line)] px-4 pt-3 pb-1">
        <div className="flex items-center gap-3">
          <a href={href({ name: "profile", handle: author.handle, tab: "posts" })} aria-label={`${author.name} 프로필`}>
            <Avatar user={author} size={44} />
          </a>
          <div className="min-w-0 flex-1">
            <a href={href({ name: "profile", handle: author.handle, tab: "posts" })} className="block truncate text-[16px] font-[650] hover:underline">
              {author.name}
            </a>
            <div className="truncate text-[14px] text-[var(--muted)]">@{author.handle}</div>
          </div>
          {author.id !== meId && !state.following[author.id] && <FollowButton userId={author.id} size="small" />}
        </div>

        <p className="mt-3 text-[18px] leading-[1.55] break-words whitespace-pre-wrap">
          <RichText text={post.text} />
        </p>
        <PhotoGrid photos={post.photos} />
        <time dateTime={new Date(post.createdAt).toISOString()} className="mt-3 block text-[14px] text-[var(--muted)]">
          {fullTime(post.createdAt)}
        </time>

        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line)] pt-3 text-[14px] text-[var(--muted)]">
          <Total label="답글" value={number.replies} />
          <Total label="재게시" value={number.reposts} />
          <Total label="좋아요" value={number.likes} />
          <Total label="저장" value={number.saves} />
        </dl>
        <div className="mt-2 border-t border-[var(--line)] pt-1">
          <PostActions post={post} size="large" onRemoved={goBack} />
        </div>
      </article>

      <button
        type="button"
        onClick={() => openComposer(post.id)}
        className="flex w-full items-center gap-3 border-b border-[var(--line)] px-4 py-3 text-left hover:bg-[color-mix(in_srgb,var(--hover)_55%,transparent)]"
      >
        <Avatar user={me} size={36} />
        <span className="text-[15px] text-[var(--faint)]">@{author.handle} 님에게 답글 남기기</span>
      </button>

      {threads.map(({ root, chain }) => (
        <div key={root.id}>
          <PostItem post={root} showReplyContext={false} threadBelow={chain.length > 0} />
          {chain.map((reply, index) => (
            <PostItem key={reply.id} post={reply} showReplyContext={false} threadAbove threadBelow={index < chain.length - 1} />
          ))}
        </div>
      ))}
      {threads.length === 0 && <p className="px-4 py-12 text-center text-[15px] text-[var(--muted)]">첫 답글을 남겨 보세요</p>}
    </>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="sr-only">{label}</dt>
      <dd className="font-[650] text-[var(--ink)]">
        <RollingNumber value={value} />
      </dd>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
