import { motion } from "motion/react";
import { useState } from "react";

import { Avatar } from "../components/Avatar";
import { PostList } from "../components/PostRow";
import { me, ME_ID, users, type Post } from "../data";
import { formatCount } from "../format";

type ProfileTab = "threads" | "replies" | "reposts";

const profileTabs: { id: ProfileTab; label: string; emptyText: string }[] = [
  { id: "threads", label: "글", emptyText: "아직 쓴 글이 없어요" },
  { id: "replies", label: "답글", emptyText: "아직 단 답글이 없어요" },
  { id: "reposts", label: "리포스트", emptyText: "리포스트한 글이 없어요" },
];

export function ProfileScreen({ posts, onShareProfile }: { posts: Post[]; onShareProfile: () => void }) {
  const [tab, setTab] = useState<ProfileTab>("threads");

  const listByTab: Record<ProfileTab, Post[]> = {
    threads: posts.filter((post) => post.authorId === ME_ID && post.parentId === null),
    replies: posts.filter((post) => post.authorId === ME_ID && post.parentId !== null),
    reposts: posts.filter((post) => post.reposted),
  };
  const visible = listByTab[tab];
  const current = profileTabs.find((item) => item.id === tab);

  function replyNote(post: Post): string | undefined {
    if (tab !== "replies" || post.parentId === null) return undefined;
    const parent = posts.find((candidate) => candidate.id === post.parentId);
    return parent ? `${users[parent.authorId].handle}님에게 답글` : undefined;
  }

  return (
    <div className="scroll-y h-full">
      <section className="px-4 pt-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold leading-[30px] tracking-[-0.02em]">{me.name}</h1>
            <p className="mt-0.5 text-[15px]">{me.handle}</p>
          </div>
          <Avatar user={me} size={64} />
        </div>
        <p className="mt-3 break-keep text-[15px] leading-[21px]">{me.bio}</p>
        <p className="mt-3 text-[15px] text-muted">팔로워 {formatCount(me.followerCount)}명</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="hit h-[34px] rounded-[10px] border border-line-strong text-[15px] font-semibold active:opacity-60"
          >
            프로필 편집
          </button>
          <button
            type="button"
            onClick={onShareProfile}
            className="hit h-[34px] rounded-[10px] border border-line-strong text-[15px] font-semibold active:opacity-60"
          >
            프로필 공유
          </button>
        </div>
      </section>
      <div role="tablist" className="mt-3 flex border-b border-line">
        {profileTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative h-11 flex-1 text-[15px] font-semibold transition-colors ${tab === id ? "text-ink" : "text-muted"}`}
          >
            {label}
            {tab === id && (
              <motion.span
                layoutId="profile-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-px bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>
      {/* 탭마다 목록을 새로 그려 펼침 애니메이션이 섞이지 않게 한다. */}
      <div key={tab}>
        <PostList posts={visible} noteFor={replyNote} />
      </div>
      {visible.length === 0 && current && <p className="py-16 text-center text-[15px] text-muted">{current.emptyText}</p>}
      <div className="h-8" />
    </div>
  );
}
