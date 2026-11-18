import { AnimatePresence, motion } from "motion/react";

import { communities, users, type Post } from "../data";
import { formatAgo } from "../format";
import { usePostActions } from "../postActions";
import { ActionBar } from "./ActionBar";
import { Avatar } from "./Avatar";
import { ChevronRightIcon, MoreIcon, VerifiedBadge } from "./Icons";
import { PostMedia } from "./PostMedia";

export function PostByline({ post, showCommunity }: { post: Post; showCommunity: boolean }) {
  const { openCommunity } = usePostActions();
  const author = users[post.authorId];
  const community = showCommunity && post.communityId ? communities[post.communityId] : null;

  return (
    <div className="flex min-w-0 items-center gap-1 text-[15px] leading-[21px]">
      <span className="truncate font-semibold">{author.handle}</span>
      {author.verified && <VerifiedBadge />}
      {community && (
        <>
          <ChevronRightIcon size={13} strokeWidth={2.2} className="shrink-0 text-faint" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openCommunity(community.id);
            }}
            className="truncate font-semibold text-soft active:opacity-50"
          >
            {community.name}
          </button>
        </>
      )}
      <span className="ml-1 shrink-0 text-muted">{formatAgo(post.minutesAgo)}</span>
    </div>
  );
}

export function MoreButton() {
  return (
    <button
      type="button"
      aria-label="더 보기"
      onClick={(event) => event.stopPropagation()}
      className="hit -mr-1 grid size-7 shrink-0 place-items-center text-ink/70"
    >
      <MoreIcon size={18} />
    </button>
  );
}

type PostRowProps = {
  post: Post;
  openable: boolean;
  showCommunity: boolean;
  note?: string;
};

export function PostRow({ post, openable, showCommunity, note }: PostRowProps) {
  const { openPost } = usePostActions();
  const author = users[post.authorId];

  return (
    <article
      onClick={openable ? () => openPost(post.id) : undefined}
      className="border-b border-line px-4 pb-1 pt-3"
    >
      {note && <p className="mb-1 pl-12 text-[13px] text-muted">{note}</p>}
      <div className="flex gap-3">
        <div className="pt-0.5">
          <Avatar user={author} size={36} />
        </div>
        <div className="min-w-0 flex-1">
          <header className="flex items-center gap-2">
            <PostByline post={post} showCommunity={showCommunity} />
            <span className="ml-auto" />
            <MoreButton />
          </header>
          <p className="mt-0.5 whitespace-pre-wrap break-keep text-[15px] leading-[21px] [overflow-wrap:anywhere]">
            {post.text}
          </p>
          <PostMedia post={post} />
          <ActionBar post={post} onReply={() => openPost(post.id, true)} />
        </div>
      </div>
    </article>
  );
}

const insertTransition = { duration: 0.34, ease: [0.32, 0.72, 0, 1] } as const;

// 새로 쓴 글은 높이를 펼치며 들어오고, 처음 그릴 때 이미 있던 글은 움직이지 않는다.
// 붙은 직후 그 자리로 스크롤해야 하는 목록은 높이가 바로 잡히도록 "fade"로 들어온다.
export function PostList({
  posts,
  openable = true,
  showCommunity = true,
  enter = "expand",
  noteFor,
}: {
  posts: Post[];
  openable?: boolean;
  showCommunity?: boolean;
  enter?: "expand" | "fade";
  noteFor?: (post: Post) => string | undefined;
}) {
  return (
    <AnimatePresence initial={false}>
      {posts.map((post) => (
        <motion.div
          key={post.id}
          initial={enter === "expand" ? { height: 0, opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0 }}
          transition={insertTransition}
          className="overflow-hidden"
        >
          <PostRow post={post} openable={openable} showCommunity={showCommunity} note={noteFor?.(post)} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
