// 피드의 글 한 행. 아바타 옆에 이름과 시각, @아이디, 본문, 사진, 반응 줄을 쌓고 행 사이는 가는 선으로만 나눈다(r1 Mastodon).
import type { MouseEvent, ReactNode } from "react";

import { useApp } from "../app-context";
import { meId } from "../data";
import { relativeTime } from "../format";
import { href, navigate } from "../router";
import type { StoredPost } from "../store";
import { Avatar } from "./Avatar";
import { PinIcon, RepostIcon } from "./Icons";
import { PhotoGrid } from "./PhotoGrid";
import { PostActions } from "./PostActions";
import { RichText } from "./RichText";

export function PostItem({
  post,
  repostedBy,
  pinned = false,
  showReplyContext = true,
  threadAbove = false,
  threadBelow = false,
  divider = true,
}: {
  post: StoredPost;
  repostedBy?: string;
  pinned?: boolean;
  showReplyContext?: boolean;
  // 답글 줄기에서 위아래 글과 아바타를 세로선으로 잇는다.
  threadAbove?: boolean;
  threadBelow?: boolean;
  divider?: boolean;
}) {
  const { state, now } = useApp();
  const author = state.users[post.authorId];
  const parent = post.replyToId ? state.posts[post.replyToId] : undefined;
  const parentAuthor = parent ? state.users[parent.authorId] : undefined;

  let context: ReactNode = null;
  if (pinned) context = <Context icon={<PinIcon size={13} />}>고정됨</Context>;
  else if (repostedBy) {
    const name = repostedBy === meId ? "내가" : `${state.users[repostedBy].name} 님이`;
    context = <Context icon={<RepostIcon size={13} />}>{name} 재게시함</Context>;
  } else if (showReplyContext && parentAuthor) {
    context = <Context>@{parentAuthor.handle} 님에게 답글</Context>;
  }

  const openDetail = (event: MouseEvent) => {
    // 글자를 드래그해 고르는 중이면 이동하지 않는다.
    if (window.getSelection()?.toString()) return;
    if ((event.target as HTMLElement).closest("a, button")) return;
    navigate({ name: "post", id: post.id });
  };

  return (
    <article
      onClick={openDetail}
      className={`relative cursor-pointer px-4 transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--hover)_55%,transparent)] ${
        divider && !threadBelow ? "border-b border-[var(--line)]" : ""
      } ${threadAbove ? "pt-1" : "pt-3"} pb-2`}
    >
      {context && <div className="mb-1 pl-[52px]">{context}</div>}
      <div className="flex gap-3">
        <div className="relative flex flex-col items-center">
          {threadAbove && <span className="absolute -top-1 h-1 w-0.5 bg-[var(--line)]" />}
          <a href={href({ name: "profile", handle: author.handle, tab: "posts" })} aria-label={`${author.name} 프로필`}>
            <Avatar user={author} />
          </a>
          {threadBelow && <span className="mt-1 w-0.5 flex-1 rounded-full bg-[var(--line)]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-[15px] leading-tight">
            <a href={href({ name: "profile", handle: author.handle, tab: "posts" })} className="truncate font-[650] hover:underline">
              {author.name}
            </a>
            <span className="text-[var(--faint)]">·</span>
            <a href={href({ name: "post", id: post.id })} className="shrink-0 text-[14px] text-[var(--faint)] hover:underline">
              <time dateTime={new Date(post.createdAt).toISOString()}>{relativeTime(post.createdAt, now)}</time>
            </a>
          </div>
          <div className="mt-0.5 truncate text-[14px] text-[var(--muted)]">@{author.handle}</div>
          <p className="mt-1.5 text-[15px] leading-[1.55] break-words whitespace-pre-wrap">
            <RichText text={post.text} />
          </p>
          <PhotoGrid photos={post.photos} />
          <PostActions post={post} />
        </div>
      </div>
    </article>
  );
}

function Context({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--muted)]">
      {icon}
      {children}
    </span>
  );
}
