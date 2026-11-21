import { motion } from "motion/react";

import { useApp } from "../context";
import type { Post, Visibility } from "../data";
import { compactCount, relativeTime } from "../format";
import { canView, commentsOf, creatorById, fanById, postLikes } from "../store";
import { CreatorAvatar, FanAvatar } from "./Avatar";
import { BodyText } from "./BodyText";
import { CommentIcon, EyeIcon, HeartIcon, LockIcon } from "./Icons";
import { Scene } from "./Scene";
import { creatorAccent, creatorSoft } from "./tone";

export const visibilityLabel: Record<Visibility, string> = {
  public: "전체 공개",
  member: "멤버 전용",
  close: "가까운 멤버 전용",
};

export function LikeButton({ post, size = 19 }: { post: Post; size?: number }) {
  const { state, dispatch } = useApp();
  const liked = state.likedPosts.includes(post.id);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.86 }}
      onClick={() => dispatch({ type: "toggleLikePost", postId: post.id })}
      aria-pressed={liked}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
      className={`flex h-9 items-center gap-1 rounded-full px-2 text-[13px] hover:bg-sunken ${liked ? "text-like" : "text-muted"}`}
    >
      <HeartIcon size={size} filled={liked} />
      {compactCount(postLikes(state, post))}
    </motion.button>
  );
}

function AuthorLine({ post }: { post: Post }) {
  const { now, go } = useApp();
  const space = creatorById(post.creatorId);
  if (post.author.kind === "creator") {
    return (
      <button
        type="button"
        onClick={() => go({ name: "creator", creatorId: space.id, tab: "home" })}
        className="flex min-w-0 items-center gap-2.5 text-left"
      >
        <CreatorAvatar creator={space} size={36} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold">{space.name}</span>
          <span className="block text-[12px] text-muted">{relativeTime(post.createdAt, now)}</span>
        </span>
      </button>
    );
  }
  const fan = fanById(post.author.fanId);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <FanAvatar fan={fan} size={36} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold">{fan.name}</span>
        <span className="block text-[12px] text-muted">
          To. {space.callName} · {relativeTime(post.createdAt, now)}
        </span>
      </span>
    </div>
  );
}

// 홈과 팬 글 목록에 쓰는 한 열 카드. 잠긴 글은 본문을 가리고 멤버십 탭으로 보낸다.
export function FeedCard({ post }: { post: Post }) {
  const { state, go } = useApp();
  const space = creatorById(post.creatorId);
  const unlocked = canView(state, post);
  const comments = commentsOf(state, post.id);
  const creatorCommented = post.author.kind === "fan" && comments.some((comment) => comment.author.kind === "creator");
  const openPost = () => go({ name: "post", postId: post.id });

  return (
    <article className="rounded-2xl border border-line bg-surface px-5 pb-3 pt-4">
      <AuthorLine post={post} />
      {unlocked ? (
        <button type="button" onClick={openPost} className="mt-3 block w-full text-left">
          <BodyText text={post.body} hue={space.hue} className="line-clamp-5 whitespace-pre-line text-[15px] leading-[1.6]" />
          {post.scene && <Scene motif={post.scene} hue={space.hue} className="mt-3 aspect-[16/10] w-full rounded-xl" />}
        </button>
      ) : (
        <LockedBody post={post} compact />
      )}
      <div className="mt-2 flex items-center gap-1">
        <LikeButton post={post} />
        <button
          type="button"
          onClick={openPost}
          aria-label="댓글"
          className="flex h-9 items-center gap-1 rounded-full px-2 text-[13px] text-muted hover:bg-sunken"
        >
          <CommentIcon size={19} />
          {unlocked ? comments.length : "-"}
        </button>
        <span className="ml-2 flex items-center gap-1 text-[12px] text-muted">
          {post.visibility !== "public" && <LockIcon size={13} />}
          <span style={post.visibility !== "public" ? { color: creatorAccent(space.hue) } : undefined}>{visibilityLabel[post.visibility]}</span>
          <span aria-hidden="true">·</span>
          <EyeIcon size={13} />
          {compactCount(post.views)}
        </span>
        {creatorCommented && (
          <button
            type="button"
            onClick={openPost}
            className="ml-auto flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-semibold"
            style={{ background: creatorSoft(space.hue), color: creatorAccent(space.hue) }}
          >
            <CreatorAvatar creator={space} size={20} />
            {space.callName} 댓글
          </button>
        )}
      </div>
    </article>
  );
}

// 크리에이터 페이지의 3열 격자 카드. 잠긴 글은 그림을 흐리게 하고 배지를 단다.
export function GridCard({ post }: { post: Post }) {
  const { state, now, go } = useApp();
  const space = creatorById(post.creatorId);
  const unlocked = canView(state, post);
  const comments = commentsOf(state, post.id);

  return (
    <button
      type="button"
      onClick={() => (unlocked ? go({ name: "post", postId: post.id }) : go({ name: "creator", creatorId: space.id, tab: "membership" }))}
      className="group flex flex-col text-left"
    >
      <span className="relative block overflow-hidden rounded-xl">
        {post.scene ? (
          <Scene
            motif={post.scene}
            hue={space.hue}
            className={`aspect-[16/10] w-full transition-transform duration-300 group-hover:scale-[1.03] ${unlocked ? "" : "blur-md"}`}
          />
        ) : (
          <span className="flex aspect-[16/10] w-full items-center bg-sunken p-4 text-[13px] leading-snug text-muted">
            <span className={`line-clamp-4 ${unlocked ? "" : "blur-sm"}`}>{post.body}</span>
          </span>
        )}
        {!unlocked && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11.5px] font-semibold text-white">
            <LockIcon size={12} /> {visibilityLabel[post.visibility]}
          </span>
        )}
      </span>
      <span className={`mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug ${unlocked ? "" : "text-muted"}`}>{post.body}</span>
      <span className="mt-1 flex items-center gap-2 text-[12px] text-muted">
        {relativeTime(post.createdAt, now)}
        <span className="flex items-center gap-0.5">
          <HeartIcon size={12} /> {compactCount(postLikes(state, post))}
        </span>
        {unlocked && (
          <span className="flex items-center gap-0.5">
            <CommentIcon size={12} /> {comments.length}
          </span>
        )}
      </span>
    </button>
  );
}

// 잠긴 글의 본문 자리. 회색 줄로 가리고 글자 수와 그림 수만 알려 준다.
export function LockedBody({ post, compact }: { post: Post; compact?: boolean }) {
  const { go } = useApp();
  const space = creatorById(post.creatorId);
  const lines = compact ? 4 : 9;
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl bg-sunken px-4 py-4">
      <div aria-hidden="true" className="flex flex-col gap-2.5">
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} className="h-2.5 rounded-full bg-line" style={{ width: `${index === lines - 1 ? 55 : 92 - (index % 3) * 6}%` }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
        <LockIcon size={22} />
        <p className="text-[13.5px] font-semibold">{visibilityLabel[post.visibility]} 글</p>
        <p className="text-[12px] text-muted">
          글자 {post.body.length}자{post.scene ? " · 그림 1장" : ""}
        </p>
        <button
          type="button"
          onClick={() => go({ name: "creator", creatorId: space.id, tab: "membership" })}
          className="mt-1 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white"
          style={{ background: creatorAccent(space.hue) }}
        >
          멤버십 보기
        </button>
      </div>
    </div>
  );
}
