// 팔로우 버튼. 팔로우 전에는 본문색으로 채운 주 버튼, 팔로우 중에는 테두리 버튼. 글자는 아래에서 올라오며 바뀐다(tastepin 버튼 상태 전환).
import { AnimatePresence, motion } from "motion/react";

import { useApp } from "../app-context";
import { press } from "../motion";

export function FollowButton({ userId, size = "regular" }: { userId: string; size?: "regular" | "small" }) {
  const { state, dispatch, toast } = useApp();
  const user = state.users[userId];
  const following = Boolean(state.following[userId]);
  const label = following ? "팔로잉" : "팔로우";

  return (
    <motion.button
      type="button"
      aria-pressed={following}
      aria-label={following ? `${user.name} 님 팔로우 취소` : `${user.name} 님 팔로우`}
      whileTap={press}
      onClick={(event) => {
        event.stopPropagation();
        dispatch({ type: "toggleFollow", userId });
        if (following) toast(`${user.name} 님 팔로우를 취소했어요`, { label: "되돌리기", run: () => dispatch({ type: "toggleFollow", userId }) });
      }}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-md font-semibold transition-[filter,background-color,color] duration-150 hover:brightness-[0.88] ${
        size === "small" ? "h-8 w-[72px] text-[14px]" : "h-11 w-[92px] text-[14px]"
      } ${following ? "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]" : "bg-[var(--ink)] text-[var(--surface)]"}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { duration: 0.16, delay: 0.04, ease: "easeOut" } }}
          exit={{ y: -6, opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
