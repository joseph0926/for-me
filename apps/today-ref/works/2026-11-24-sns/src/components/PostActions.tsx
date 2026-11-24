// 글 아래 반응 줄: 답글, 재게시, 좋아요 수와 오른쪽 저장, 더보기(r1 Mastodon의 반응 줄 구성).
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { useApp } from "../app-context";
import { meId } from "../data";
import { easeOutCubic, press } from "../motion";
import { navigate } from "../router";
import { counts, type StoredPost } from "../store";
import { BookmarkIcon, HeartIcon, LinkIcon, ReplyIcon, RepostIcon, TrashIcon, UserPlusIcon } from "./Icons";
import { MoreMenu, type MenuEntry } from "./Menu";
import { RollingNumber } from "./RollingNumber";

type Size = "compact" | "large";

export function PostActions({ post, size = "compact", onRemoved }: { post: StoredPost; size?: Size; onRemoved?: () => void }) {
  const { state, dispatch, openComposer, toast } = useApp();
  const number = counts(state, post);
  const author = state.users[post.authorId];
  const iconSize = size === "large" ? 22 : 18;
  const liked = Boolean(state.liked[post.id]);
  const reposted = Boolean(state.reposted[post.id]);
  const saved = Boolean(state.saved[post.id]);
  const mine = post.authorId === meId;
  const following = Boolean(state.following[post.authorId]);

  const entries: MenuEntry[] = [
    {
      key: "link",
      label: "링크 복사",
      icon: <LinkIcon size={16} />,
      onSelect: () => {
        const url = `${window.location.origin}${window.location.pathname}#/post/${post.id}`;
        navigator.clipboard.writeText(url).then(
          () => toast("링크를 복사했어요"),
          () => toast("클립보드에 쓸 수 없어요. 주소창의 주소를 복사하세요"),
        );
      },
    },
  ];
  if (!mine) {
    entries.push({
      key: "follow",
      label: following ? `@${author.handle} 팔로우 취소` : `@${author.handle} 팔로우`,
      icon: <UserPlusIcon size={16} />,
      onSelect: () => {
        dispatch({ type: "toggleFollow", userId: author.id });
        toast(following ? `${author.name} 님 팔로우를 취소했어요` : `${author.name} 님을 팔로우해요`);
      },
    });
  } else {
    entries.push({
      key: "delete",
      label: "글 지우기",
      icon: <TrashIcon size={16} />,
      danger: true,
      onSelect: () => {
        dispatch({ type: "remove", postId: post.id });
        onRemoved?.();
        toast("글을 지웠어요", { label: "되돌리기", run: () => dispatch({ type: "restore", post }) });
      },
    });
  }

  return (
    <div className={`-ml-2 flex items-center ${size === "large" ? "mt-1 gap-6" : "mt-1.5 gap-3"}`}>
      <ActionButton label={`답글 ${number.replies}개 쓰기`} onClick={() => openComposer(post.id)}>
        <ReplyIcon size={iconSize} />
        {size === "compact" && <Count value={number.replies} />}
      </ActionButton>
      <ActionButton
        label={reposted ? "재게시 취소" : "재게시"}
        pressed={reposted}
        tone="accent"
        onClick={() => dispatch({ type: "toggle", flag: "reposted", postId: post.id, at: Date.now() })}
      >
        <RepostIcon size={iconSize} />
        {size === "compact" && <Count value={number.reposts} />}
      </ActionButton>
      <ActionButton
        label={liked ? "좋아요 취소" : "좋아요"}
        pressed={liked}
        tone="like"
        onClick={() => dispatch({ type: "toggle", flag: "liked", postId: post.id, at: Date.now() })}
      >
        <SwapIcon on={liked}>
          <HeartIcon size={iconSize} filled={liked} />
        </SwapIcon>
        {size === "compact" && <Count value={number.likes} />}
      </ActionButton>
      <span className="flex-1" />
      <ActionButton
        label={saved ? "저장 취소" : "저장"}
        pressed={saved}
        tone="ink"
        onClick={() => {
          dispatch({ type: "toggle", flag: "saved", postId: post.id, at: Date.now() });
          if (!saved) toast("저장함에 넣었어요", { label: "보기", run: () => navigate({ name: "saved" }) });
        }}
      >
        <SwapIcon on={saved}>
          <BookmarkIcon size={iconSize} filled={saved} />
        </SwapIcon>
      </ActionButton>
      <MoreMenu entries={entries} label="더보기" />
    </div>
  );
}

const tones = {
  accent: "text-[var(--accent)]",
  like: "text-[var(--like)]",
  ink: "text-[var(--ink)]",
} as const;

function ActionButton({
  label,
  pressed,
  tone,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  tone?: keyof typeof tones;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      whileTap={press}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-9 min-w-9 items-center gap-1.5 rounded-md px-2 text-[14px] transition-colors duration-150 hover:bg-[var(--hover)] ${
        pressed && tone ? tones[tone] : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </motion.button>
  );
}

function Count({ value }: { value: number }) {
  return <RollingNumber value={value} className={value === 0 ? "invisible" : ""} />;
}

// 아이콘이 채운 모양으로 바뀔 때 나가는 쪽은 0.5배로 줄고 들어오는 쪽은 0.5배에서 커지며 같은 칸에서 겹쳐 바뀐다.
function SwapIcon({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className="relative grid">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={on ? "on" : "off"}
          className="grid"
          initial={{ scale: 0.5, opacity: 0, filter: "blur(2px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          exit={{ scale: 0.5, opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: 0.2, ease: easeOutCubic }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
