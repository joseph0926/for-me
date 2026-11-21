import { useRef, useState, type FormEvent } from "react";

import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { BodyText } from "../components/BodyText";
import { BackIcon, CommentIcon, HeartIcon, SendIcon } from "../components/Icons";
import { LikeButton, LockedBody, visibilityLabel } from "../components/PostCards";
import { Scene } from "../components/Scene";
import { creatorAccent, creatorSoft } from "../components/tone";
import { useApp } from "../context";
import { ME, type Comment, type Creator } from "../data";
import { compactCount, relativeTime } from "../format";
import { canView, commentLikes, commentsOf, creatorById, fanById } from "../store";

const COMMENT_MAX_LENGTH = 300;

export function PostScreen({ postId }: { postId: string }) {
  const { state, dispatch, now, go, back } = useApp();
  const post = state.posts.find((item) => item.id === postId);
  const listEnd = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  if (!post) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-20 text-center">
        <p className="text-[15px] text-muted">삭제되었거나 찾을 수 없는 글이에요</p>
        <button type="button" onClick={() => go({ name: "home" })} className="mt-4 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface">
          홈으로
        </button>
      </div>
    );
  }

  const space = creatorById(post.creatorId);
  const unlocked = canView(state, post);
  const comments = commentsOf(state, post.id).sort((a, b) => a.createdAt - b.createdAt);
  const isFanPost = post.author.kind === "fan";
  const creatorComments = isFanPost ? comments.filter((comment) => comment.author.kind === "creator") : [];
  const generalComments = isFanPost ? comments.filter((comment) => comment.author.kind === "fan") : comments;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    dispatch({
      type: "addComment",
      comment: { id: crypto.randomUUID(), postId: post.id, author: { kind: "fan", fanId: ME.id }, createdAt: Date.now(), body, likes: 0 },
    });
    setDraft("");
    requestAnimationFrame(() => listEnd.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-24 pt-4 md:px-6 md:pb-12">
      <button type="button" onClick={back} className="-ml-2 flex h-10 items-center gap-1 rounded-full pl-1 pr-3 text-[14px] text-muted hover:bg-sunken">
        <BackIcon size={20} /> 뒤로
      </button>

      <article className="mt-2">
        <p className="text-[13px] font-semibold" style={{ color: creatorAccent(space.hue) }}>
          {isFanPost ? `To. ${space.callName}` : `From ${space.callName}`}
        </p>
        <header className="mt-3 flex items-center gap-3">
          {post.author.kind === "creator" ? (
            <button type="button" onClick={() => go({ name: "creator", creatorId: space.id, tab: "home" })}>
              <CreatorAvatar creator={space} size={44} />
            </button>
          ) : (
            <FanAvatar fan={fanById(post.author.fanId)} size={44} />
          )}
          <span>
            <span className="block text-[15.5px] font-semibold">
              {post.author.kind === "creator" ? space.name : fanById(post.author.fanId).name}
            </span>
            <span className="block text-[12.5px] text-muted">
              {relativeTime(post.createdAt, now)} · {visibilityLabel[post.visibility]} · 조회 {compactCount(post.views)}
            </span>
          </span>
        </header>

        {unlocked ? (
          <>
            <BodyText text={post.body} hue={space.hue} className="mt-5 whitespace-pre-line text-[16.5px] leading-[1.7]" />
            {post.scene && <Scene motif={post.scene} hue={space.hue} className="mt-5 aspect-[16/10] w-full rounded-2xl" />}
          </>
        ) : (
          <LockedBody post={post} />
        )}

        <div className="mt-4 flex items-center gap-1 border-b border-line pb-3">
          <LikeButton post={post} size={20} />
          {unlocked && (
            <span className="flex h-9 items-center gap-1 px-2 text-[13px] text-muted">
              <CommentIcon size={20} />
              {comments.length}
            </span>
          )}
        </div>
      </article>

      {unlocked && (
        <>
          {creatorComments.length > 0 && (
            <section className="mt-6">
              <h2 className="text-[15px] font-bold">
                크리에이터 댓글 <span style={{ color: creatorAccent(space.hue) }}>{creatorComments.length}</span>
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {creatorComments.map((comment) => (
                  <li key={comment.id} className="rounded-2xl px-4 py-3.5" style={{ background: creatorSoft(space.hue) }}>
                    <CommentItem comment={comment} space={space} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-[15px] font-bold">
              댓글 <span className="text-muted">{generalComments.length}</span>
            </h2>
            <form onSubmit={submit} className="mt-3 flex items-center gap-2.5">
              <FanAvatar fan={ME} size={34} />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={COMMENT_MAX_LENGTH}
                placeholder="댓글을 남겨 주세요"
                aria-label="댓글"
                className="h-11 min-w-0 flex-1 rounded-full bg-sunken px-4 text-[14px] outline-none placeholder:text-muted focus:ring-2 focus:ring-line"
              />
              <button
                type="submit"
                disabled={draft.trim() === ""}
                aria-label="댓글 보내기"
                className="grid size-11 place-items-center rounded-full text-white disabled:opacity-35"
                style={{ background: creatorAccent(space.hue) }}
              >
                <SendIcon size={19} />
              </button>
            </form>
            {generalComments.length === 0 ? (
              <p className="py-10 text-center text-[13.5px] text-muted">첫 댓글을 남겨 보세요</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {generalComments.map((comment) => (
                  <li key={comment.id} className="py-3.5">
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
  );
}

function CommentItem({ comment, space }: { comment: Comment; space: Creator }) {
  const { state, dispatch, now } = useApp();
  const liked = state.likedComments.includes(comment.id);
  const name = comment.author.kind === "creator" ? creatorById(comment.author.creatorId).name : fanById(comment.author.fanId).name;

  return (
    <div className="flex gap-3">
      {comment.author.kind === "creator" ? (
        <CreatorAvatar creator={creatorById(comment.author.creatorId)} size={34} />
      ) : (
        <FanAvatar fan={fanById(comment.author.fanId)} size={34} />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13.5px]">
          <span className="font-semibold">{name}</span>
          {comment.author.kind === "creator" && (
            <span className="rounded px-1 text-[10.5px] font-bold leading-4 text-white" style={{ background: creatorAccent(space.hue) }}>
              크리에이터
            </span>
          )}
          <span className="text-[12px] text-muted">{relativeTime(comment.createdAt, now)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-line text-[14.5px] leading-[1.55]">{comment.body}</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: "toggleLikeComment", commentId: comment.id })}
        aria-pressed={liked}
        aria-label={liked ? "댓글 좋아요 취소" : "댓글 좋아요"}
        className={`flex w-10 shrink-0 flex-col items-center pt-0.5 text-[11.5px] ${liked ? "text-like" : "text-muted"}`}
      >
        <HeartIcon size={17} filled={liked} />
        {compactCount(commentLikes(state, comment))}
      </button>
    </div>
  );
}
