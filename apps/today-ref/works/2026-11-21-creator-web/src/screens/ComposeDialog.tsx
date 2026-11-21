import { useState } from "react";

import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { creatorAccent } from "../components/tone";
import { useApp } from "../context";
import { ME, type Post } from "../data";
import { CREATOR_REPLY_DELAY_MS, creatorById } from "../store";

const FAN_POST_MAX_LENGTH = 500;

export function ComposeDialog({ creatorId, onClose }: { creatorId: string; onClose: () => void }) {
  const { dispatch, go, showToast } = useApp();
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
    go({ name: "post", postId: post.id });
    showToast("팬 글을 올렸어요");
  };

  return (
    <Dialog title="팬 글 쓰기" onClose={onClose}>
      <div className="flex items-center gap-2 border-b border-line px-5 py-2.5 text-[13.5px]">
        <span className="text-muted">To.</span>
        <CreatorAvatar creator={creator} size={24} />
        <span className="font-semibold">{creator.name}</span>
      </div>
      <div className="flex gap-3 px-5 pb-4 pt-4">
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
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-3">
        <span className="text-[12px] text-muted">
          {body.length} / {FAN_POST_MAX_LENGTH}
        </span>
        <button
          type="button"
          onClick={publish}
          disabled={!trimmed}
          className="h-10 rounded-full px-5 text-[14px] font-semibold text-white disabled:opacity-35"
          style={{ background: creatorAccent(creator.hue) }}
        >
          올리기
        </button>
      </div>
    </Dialog>
  );
}
