import { useState } from "react";

import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { Sheet } from "../components/Sheet";
import { creatorAccent } from "../components/tone";
import { useApp } from "../context";
import { ME, type Post } from "../data";
import { CREATOR_REPLY_DELAY_MS, creatorById } from "../store";

const FAN_POST_MAX_LENGTH = 500;

export function ComposeSheet({ creatorId, onClose }: { creatorId: string; onClose: () => void }) {
  const { dispatch, open, showToast } = useApp();
  const creator = creatorById(creatorId);
  const [body, setBody] = useState("");
  const trimmed = body.trim();

  const publish = () => {
    if (!trimmed) return;
    const now = Date.now();
    const post: Post = {
      id: crypto.randomUUID(),
      creatorId: creator.id,
      author: { kind: "fan", fanId: ME.id },
      createdAt: now,
      body: `#to_${creator.callName} ${trimmed}`,
      scene: null,
      visibility: "public",
      views: 0,
      likes: 0,
    };
    dispatch({ type: "addFanPost", post, replyDueAt: now + CREATOR_REPLY_DELAY_MS });
    onClose();
    open({ name: "post", postId: post.id, focusComment: false });
    showToast("팬 글을 올렸어요");
  };

  return (
    <Sheet label="팬 글 쓰기" onClose={onClose}>
      <div className="flex items-center justify-between px-4 pb-2 pt-2">
        <button type="button" onClick={onClose} className="h-9 px-1 text-[14px] text-muted">
          취소
        </button>
        <h2 className="text-[15px] font-semibold">팬 글 쓰기</h2>
        <button
          type="button"
          onClick={publish}
          disabled={!trimmed}
          className="h-9 rounded-full px-4 text-[14px] font-semibold text-white disabled:opacity-35"
          style={{ background: creatorAccent(creator.hue) }}
        >
          올리기
        </button>
      </div>
      <div className="flex items-center gap-2 border-y border-line px-4 py-2.5 text-[13.5px]">
        <span className="text-muted">To.</span>
        <CreatorAvatar creator={creator} size={24} />
        <span className="font-semibold">{creator.name}</span>
      </div>
      <div className="flex gap-3 px-4 pb-5 pt-3.5">
        <FanAvatar fan={ME} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{ME.name}</p>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={FAN_POST_MAX_LENGTH}
            autoFocus
            rows={6}
            placeholder={`${creator.callName}에게 전하고 싶은 말`}
            aria-label="팬 글 내용"
            className="mt-1 w-full resize-none bg-transparent text-[15px] leading-[1.55] outline-none placeholder:text-muted"
          />
          <p className="text-right text-[12px] text-muted">
            {body.length} / {FAN_POST_MAX_LENGTH}
          </p>
        </div>
      </div>
    </Sheet>
  );
}
