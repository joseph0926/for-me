import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { flushSync } from "react-dom";

import { ActionBar } from "../components/ActionBar";
import { Avatar } from "../components/Avatar";
import { FollowButton, NavBar } from "../components/Chrome";
import { ArrowUpIcon } from "../components/Icons";
import { PostMedia } from "../components/PostMedia";
import { MoreButton, PostByline, PostList } from "../components/PostRow";
import { SortMenu } from "../components/SortMenu";
import { sortPosts, type SortMode } from "../content";
import { me, ME_ID, users, type Post } from "../data";

// 화면이 다 밀려 들어온 뒤에 입력창에 포커스를 준다.
const PUSH_SETTLE_MS = 450;

export function PostDetailScreen({
  post,
  replies,
  focusReply,
  isFollowingAuthor,
  onToggleFollow,
  onBack,
  onReply,
}: {
  post: Post;
  replies: Post[];
  focusReply: boolean;
  isFollowingAuthor: boolean;
  onToggleFollow: () => void;
  onBack: () => void;
  onReply: (text: string) => void;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const sortedReplies = sortPosts(replies, sortMode);

  function focusReplyInput() {
    replyInputRef.current?.focus({ preventScroll: true });
  }

  function submitReply(text: string) {
    flushSync(() => onReply(text));
    // 인기순이면 새 답글이 맨 아래, 최신순이면 맨 위에 붙는다. 붙은 자리로 스크롤한다.
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (sortMode === "popular") {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    } else {
      const repliesTop = scroller.querySelector<HTMLElement>("[data-replies]")?.offsetTop ?? 0;
      scroller.scrollTo({ top: Math.max(0, repliesTop - 44), behavior: "smooth" });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <NavBar title="게시물" onBack={onBack} />
      <div ref={scrollRef} className="scroll-y relative min-h-0 flex-1">
        <MainPost
          post={post}
          isFollowingAuthor={isFollowingAuthor}
          onToggleFollow={onToggleFollow}
          onReply={focusReplyInput}
        />
        <div className="flex h-12 items-center border-b border-line px-4">
          <SortMenu value={sortMode} labels={{ popular: "인기", recent: "최신" }} onChange={setSortMode} />
        </div>
        <div data-replies>
          <PostList posts={sortedReplies} openable={false} enter="fade" />
        </div>
        {replies.length === 0 && <p className="py-12 text-center text-[15px] text-muted">아직 답글이 없어요</p>}
        <div className="h-4" />
      </div>
      <ReplyBar autoFocus={focusReply} inputRef={replyInputRef} onSubmit={submitReply} />
    </div>
  );
}

function MainPost({
  post,
  isFollowingAuthor,
  onToggleFollow,
  onReply,
}: {
  post: Post;
  isFollowingAuthor: boolean;
  onToggleFollow: () => void;
  onReply: () => void;
}) {
  const author = users[post.authorId];

  return (
    <article className="border-b border-line px-4 pb-1 pt-2">
      <div className="flex items-center gap-3">
        <Avatar user={author} size={36} />
        <PostByline post={post} showCommunity />
        <span className="ml-auto" />
        {post.authorId !== ME_ID && <FollowButton isFollowing={isFollowingAuthor} onToggle={onToggleFollow} />}
        <MoreButton />
      </div>
      <p className="mt-2.5 whitespace-pre-wrap break-keep text-[15px] leading-[22px] [overflow-wrap:anywhere]">
        {post.text}
      </p>
      <PostMedia post={post} />
      <ActionBar post={post} onReply={onReply} />
    </article>
  );
}

function ReplyBar({
  autoFocus,
  inputRef,
  onSubmit,
}: {
  autoFocus: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), PUSH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [autoFocus, inputRef]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-line bg-surface px-3 py-2">
      <div className="flex min-h-11 items-center gap-2.5 rounded-[22px] bg-fill pl-2 pr-1.5">
        <Avatar user={me} size={28} />
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="답글"
          placeholder="답글 달기..."
          enterKeyHint="send"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        <AnimatePresence initial={false}>
          {canSend && (
            <motion.button
              type="submit"
              aria-label="답글 보내기"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              className="hit grid size-8 shrink-0 place-items-center rounded-full bg-ink text-surface"
            >
              <ArrowUpIcon size={18} strokeWidth={2.4} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
