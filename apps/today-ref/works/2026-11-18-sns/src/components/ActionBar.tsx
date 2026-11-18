import { motion } from "motion/react";
import type { MouseEvent, ReactNode } from "react";

import type { Post } from "../data";
import { formatCount } from "../format";
import { usePostActions, useReplyCount } from "../postActions";
import { HeartIcon, ReplyIcon, RepostIcon, ShareIcon } from "./Icons";

export function ActionBar({ post, onReply }: { post: Post; onReply: () => void }) {
  const { toggleLike, toggleRepost, share } = usePostActions();
  const replyCount = useReplyCount(post.id);

  return (
    <div className="-ml-2 mt-1 flex h-10 items-center">
      <ActionButton
        label={post.liked ? "좋아요 취소" : "좋아요"}
        count={post.likeCount}
        pressed={post.liked}
        tone={post.liked ? "text-like" : "text-soft"}
        onClick={() => toggleLike(post.id)}
      >
        {/* 좋아요를 누를 때만 key가 바뀌어 다시 튀어 오른다. */}
        <motion.span
          key={post.liked ? "liked" : "idle"}
          className="grid"
          initial={{ scale: post.liked ? 0.55 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 700, damping: 14 }}
        >
          <HeartIcon size={20} filled={post.liked} />
        </motion.span>
      </ActionButton>
      <ActionButton label="답글" count={replyCount} onClick={onReply}>
        <ReplyIcon size={20} />
      </ActionButton>
      <ActionButton
        label={post.reposted ? "리포스트 취소" : "리포스트"}
        count={post.repostCount}
        pressed={post.reposted}
        tone={post.reposted ? "text-ink" : "text-soft"}
        onClick={() => toggleRepost(post.id)}
      >
        <RepostIcon size={20} strokeWidth={post.reposted ? 2.4 : 1.8} />
      </ActionButton>
      <ActionButton label="공유" count={post.shareCount} onClick={() => share(post.id)}>
        <ShareIcon size={19} />
      </ActionButton>
    </div>
  );
}

function ActionButton({
  label,
  count,
  pressed,
  tone = "text-soft",
  onClick,
  children,
}: {
  label: string;
  count: number;
  pressed?: boolean;
  tone?: "text-soft" | "text-like" | "text-ink";
  onClick: () => void;
  children: ReactNode;
}) {
  function handleClick(event: MouseEvent) {
    event.stopPropagation();
    onClick();
  }

  return (
    <button
      type="button"
      aria-label={count > 0 ? `${label} ${count}` : label}
      aria-pressed={pressed}
      onClick={handleClick}
      className={`hit flex h-9 min-w-9 items-center gap-1 rounded-full px-2 transition-opacity active:opacity-50 ${tone}`}
    >
      {children}
      {count > 0 && <span className="text-[13px] tabular-nums">{formatCount(count)}</span>}
    </button>
  );
}
