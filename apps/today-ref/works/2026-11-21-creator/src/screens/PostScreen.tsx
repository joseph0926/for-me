import { motion } from "motion/react";
import { useRef, useState, type FormEvent } from "react";

import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { BodyText } from "../components/BodyText";
import { CommentIcon, HeartIcon, LockIcon, SendIcon } from "../components/Icons";
import { visibilityLabel } from "../components/PostCard";
import { Scene } from "../components/Scene";
import { TopBar } from "../components/TopBar";
import { creatorAccent, creatorSoft } from "../components/tone";
import { useApp } from "../context";
import { ME, type Comment, type Creator } from "../data";
import { compactCount, relativeTime } from "../format";
import { canView, commentLikes, commentsOf, creatorById, fanById, postLikes } from "../store";

const COMMENT_MAX_LENGTH = 300;

export function PostScreen({ postId, focusComment }: { postId: string; focusComment: boolean }) {
  const { state, dispatch, now, openMembership } = useApp();
  const post = state.posts.find((item) => item.id === postId);
  const listEnd = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  if (!post) {
    return (
      <div className="flex h-full flex-col">
        <TopBar title="글" />
        <p className="p-10 text-center text-[14px] text-muted">삭제되었거나 찾을 수 없는 글이에요</p>
      </div>
    );
  }

  const space = creatorById(post.creatorId);
  const unlocked = canView(state, post);
  const comments = commentsOf(state, post.id).sort((a, b) => a.createdAt - b.createdAt);
  const isFanPost = post.author.kind === "fan";
  const creatorComments = isFanPost ? comments.filter((comment) => comment.author.kind === "creator") : [];
  const generalComments = isFanPost ? comments.filter((comment) => comment.author.kind === "fan") : comments;
  const liked = state.likedPosts.includes(post.id);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    dispatch({
      type: "addComment",
      comment: { id: crypto.randomUUID(), postId: post.id, author: { kind: "fan", fanId: ME.id }, createdAt: Date.now(), body, likes: 0 },
    });
    setDraft("");
    requestAnimationFrame(() => listEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <TopBar title={isFanPost ? `To. ${space.callName}` : `From ${space.callName}`} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="px-4 pb-4 pt-4">
          <header className="flex items-center gap-2.5">
            {post.author.kind === "creator" ? (
              <CreatorAvatar creator={space} size={40} />
            ) : (
              <FanAvatar fan={fanById(post.author.fanId)} size={40} />
            )}
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">
                {post.author.kind === "creator" ? space.name : fanById(post.author.fanId).name}
              </span>
              <span className="block text-[12px] text-muted">
                {relativeTime(post.createdAt, now)} · {visibilityLabel[post.visibility]}
              </span>
            </span>
          </header>

          {unlocked ? (
            <>
              <BodyText text={post.body} hue={space.hue} className="mt-3.5 whitespace-pre-line text-[15.5px] leading-[1.6]" />
              {post.scene && <Scene motif={post.scene} hue={space.hue} className="mt-3.5 aspect-[4/3] w-full rounded-xl" />}
            </>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2.5 rounded-2xl bg-sunken px-6 py-10 text-center">
              <LockIcon size={26} />
              <p className="text-[15px] font-semibold">{visibilityLabel[post.visibility]} 글이에요</p>
              <p className="text-[13px] text-muted">{space.name} 님의 멤버십에 가입하면 바로 볼 수 있어요</p>
              <button
                type="button"
                onClick={() => openMembership(space.id)}
                className="mt-1 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: creatorAccent(space.hue) }}
              >
                멤버십 보기
              </button>
            </div>
          )}

          <div className="-ml-2 mt-3 flex items-center text-muted">
            <motion.button
              type="button"
              whileTap={{ scale: 0.86 }}
              onClick={() => dispatch({ type: "toggleLikePost", postId: post.id })}
              aria-pressed={liked}
              aria-label={liked ? "좋아요 취소" : "좋아요"}
              className={`flex h-9 items-center gap-1 rounded-full px-2 text-[13.5px] ${liked ? "text-like" : ""}`}
            >
              <HeartIcon size={20} filled={liked} />
              {compactCount(postLikes(state, post))}
            </motion.button>
            {unlocked && (
              <span className="flex h-9 items-center gap-1 px-2 text-[13.5px]">
                <CommentIcon size={20} />
                {comments.length}
              </span>
            )}
          </div>
        </article>

        {unlocked && (
          <>
            {creatorComments.length > 0 && (
              <section className="border-t-8 border-sunken px-4 py-4">
                <h2 className="text-[14px] font-bold">
                  크리에이터 댓글 <span style={{ color: creatorAccent(space.hue) }}>{creatorComments.length}</span>
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {creatorComments.map((comment) => (
                    <li key={comment.id} className="rounded-2xl px-3.5 py-3" style={{ background: creatorSoft(space.hue) }}>
                      <CommentItem comment={comment} space={space} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="border-t-8 border-sunken px-4 py-4">
              <h2 className="text-[14px] font-bold">
                댓글 <span className="text-muted">{generalComments.length}</span>
              </h2>
              {generalComments.length === 0 ? (
                <p className="py-8 text-center text-[13.5px] text-muted">첫 댓글을 남겨 보세요</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {generalComments.map((comment) => (
                    <li key={comment.id} className="py-3">
                      <CommentItem comment={comment} space={space} />
                    </li>
                  ))}
                </ul>
              )}
              <div ref={listEnd} />
            </section>
          </>
        )}
      </div>

      {unlocked && (
        <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-3 py-2">
          <FanAvatar fan={ME} size={30} />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={COMMENT_MAX_LENGTH}
            autoFocus={focusComment}
            placeholder="댓글을 남겨 주세요"
            aria-label="댓글"
            className="h-10 min-w-0 flex-1 rounded-full bg-sunken px-4 text-[14px] outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={draft.trim() === ""}
            aria-label="댓글 보내기"
            className="grid size-10 place-items-center rounded-full text-white disabled:opacity-35"
            style={{ background: creatorAccent(space.hue) }}
          >
            <SendIcon size={19} />
          </button>
        </form>
      )}
    </div>
  );
}

function CommentItem({ comment, space }: { comment: Comment; space: Creator }) {
  const { state, dispatch, now } = useApp();
  const liked = state.likedComments.includes(comment.id);
  const isCreator = comment.author.kind === "creator";
  const name = comment.author.kind === "creator" ? creatorById(comment.author.creatorId).name : fanById(comment.author.fanId).name;

  return (
    <div className="flex gap-2.5">
      {comment.author.kind === "creator" ? (
        <CreatorAvatar creator={creatorById(comment.author.creatorId)} size={32} />
      ) : (
        <FanAvatar fan={fanById(comment.author.fanId)} size={32} />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13px]">
          <span className="font-semibold">{name}</span>
          {isCreator && (
            <span className="rounded px-1 text-[10.5px] font-bold leading-4 text-white" style={{ background: creatorAccent(space.hue) }}>
              크리에이터
            </span>
          )}
          <span className="text-[11.5px] text-muted">{relativeTime(comment.createdAt, now)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-line text-[14px] leading-[1.5]">{comment.body}</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: "toggleLikeComment", commentId: comment.id })}
        aria-pressed={liked}
        aria-label={liked ? "댓글 좋아요 취소" : "댓글 좋아요"}
        className={`flex w-9 shrink-0 flex-col items-center pt-0.5 text-[11px] ${liked ? "text-like" : "text-muted"}`}
      >
        <HeartIcon size={16} filled={liked} />
        {compactCount(commentLikes(state, comment))}
      </button>
    </div>
  );
}
