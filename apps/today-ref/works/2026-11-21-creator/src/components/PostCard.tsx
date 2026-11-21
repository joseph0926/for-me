import { motion } from "motion/react";

import { useApp } from "../context";
import type { Post, Visibility } from "../data";
import { compactCount, relativeTime } from "../format";
import { canView, commentsOf, creatorById, fanById, postLikes } from "../store";
import { CreatorAvatar, FanAvatar } from "./Avatar";
import { BodyText } from "./BodyText";
import { CommentIcon, EyeIcon, HeartIcon, LockIcon } from "./Icons";
import { Scene } from "./Scene";
import { creatorAccent } from "./tone";

export const visibilityLabel: Record<Visibility, string> = {
  public: "전체 공개",
  member: "멤버 전용",
  close: "가까운 멤버 전용",
};

export function PostCard({ post, showSpace }: { post: Post; showSpace: boolean }) {
  const { state, dispatch, now, open, openMembership } = useApp();
  const space = creatorById(post.creatorId);
  const unlocked = canView(state, post);
  const comments = commentsOf(state, post.id);
  const creatorCommented = post.author.kind === "fan" && comments.some((comment) => comment.author.kind === "creator");
  const liked = state.likedPosts.includes(post.id);
  const openPost = () => open({ name: "post", postId: post.id, focusComment: false });

  return (
    <article className="bg-surface px-4 pb-3 pt-3.5">
      <header className="flex items-center gap-2.5">
        {post.author.kind === "creator" ? (
          <button
            type="button"
            onClick={() => open({ name: "creator", creatorId: space.id, section: "from" })}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <CreatorAvatar creator={space} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">{space.name}</span>
              <span className="block text-[12px] text-muted">{relativeTime(post.createdAt, now)}</span>
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <FanAvatar fan={fanById(post.author.fanId)} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">{fanById(post.author.fanId).name}</span>
              <span className="block text-[12px] text-muted">
                {showSpace ? `To. ${space.callName} · ` : ""}
                {relativeTime(post.createdAt, now)}
              </span>
            </span>
          </div>
        )}
      </header>

      {unlocked ? (
        <button type="button" onClick={openPost} className="mt-2.5 block w-full text-left">
          <BodyText text={post.body} hue={space.hue} className="line-clamp-4 whitespace-pre-line text-[14.5px] leading-[1.55]" />
          {post.scene && <Scene motif={post.scene} hue={space.hue} className="mt-2.5 aspect-[4/3] w-full rounded-xl" />}
        </button>
      ) : (
        <LockedPreview post={post} onJoin={() => openMembership(space.id)} />
      )}

      <div className="mt-2.5 flex items-center gap-1 text-[12px] text-muted">
        {post.visibility !== "public" && <LockIcon size={13} />}
        <span style={post.visibility !== "public" ? { color: creatorAccent(space.hue) } : undefined} className="font-medium">
          {visibilityLabel[post.visibility]}
        </span>
        <span aria-hidden="true">·</span>
        <EyeIcon size={13} />
        <span>조회 {compactCount(post.views)}</span>
      </div>

      <div className="-ml-2 mt-1 flex items-center">
        <motion.button
          type="button"
          whileTap={{ scale: 0.86 }}
          onClick={() => dispatch({ type: "toggleLikePost", postId: post.id })}
          aria-pressed={liked}
          aria-label={liked ? "좋아요 취소" : "좋아요"}
          className={`flex h-9 items-center gap-1 rounded-full px-2 text-[13px] ${liked ? "text-like" : "text-muted"}`}
        >
          <HeartIcon size={19} filled={liked} />
          {compactCount(postLikes(state, post))}
        </motion.button>
        <button
          type="button"
          onClick={() => (unlocked ? open({ name: "post", postId: post.id, focusComment: true }) : openMembership(space.id))}
          aria-label="댓글"
          className="flex h-9 items-center gap-1 rounded-full px-2 text-[13px] text-muted"
        >
          <CommentIcon size={19} />
          {unlocked ? comments.length : "-"}
        </button>
        {creatorCommented && (
          <button
            type="button"
            onClick={openPost}
            className="ml-auto flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-semibold"
            style={{ background: `hsl(${space.hue} 70% 50% / 0.12)`, color: creatorAccent(space.hue) }}
          >
            <CreatorAvatar creator={space} size={20} />
            {space.callName} 댓글
          </button>
        )}
      </div>
    </article>
  );
}

function LockedPreview({ post, onJoin }: { post: Post; onJoin: () => void }) {
  const space = creatorById(post.creatorId);
  return (
    <div className="relative mt-2.5 overflow-hidden rounded-xl">
      <div aria-hidden="true" className="select-none blur-[6px]">
        <p className="line-clamp-2 px-1 text-[14.5px] leading-[1.55]">{post.body}</p>
        {post.scene && <Scene motif={post.scene} hue={space.hue} className="mt-2 aspect-[16/9] w-full" />}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/55 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-ink text-surface">
          <LockIcon size={19} />
        </span>
        <p className="text-[13.5px] font-semibold">{visibilityLabel[post.visibility]} 글이에요</p>
        <button
          type="button"
          onClick={onJoin}
          className="rounded-full px-4 py-2 text-[13px] font-semibold text-white"
          style={{ background: creatorAccent(space.hue) }}
        >
          멤버십 보기
        </button>
      </div>
    </div>
  );
}
