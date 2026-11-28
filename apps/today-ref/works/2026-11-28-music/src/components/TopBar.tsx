// 상세 화면의 고정 머리 막대. 맨 위에서는 뒤로 버튼만 두고, 스크롤하면 아래에 옅은 그림자가 생기며
// 본문의 제목이 막대 밑으로 지나간 뒤에만 막대 가운데에 제목이 나온다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type RefObject } from "react";

import { quick } from "../motion";
import { useUi } from "../ui";
import { Icon } from "./Icon";

const barHeight = 48;

// 대상이 화면 스크롤 영역에서 막대 밑으로 완전히 들어갔는지. 스크롤 영역은 App의 [data-scroll]이다.
// 맨 위 1px 표식으로 스크롤 여부를 잴 때는 offset 0을 준다. 막대 높이를 빼고 재면 맨 위에서도 가려진 것으로 잡힌다.
export function useHiddenUnderBar(target: RefObject<Element | null>, offset = barHeight): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const node = target.current;
    if (!node) return;
    const root = node.closest("[data-scroll]");
    const observer = new IntersectionObserver(([entry]) => setHidden(!entry.isIntersecting), {
      root,
      rootMargin: `-${offset}px 0px 0px 0px`,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, offset]);
  return hidden;
}

export function TopBar({ title, scrolled, showTitle }: { title: string; scrolled: boolean; showTitle: boolean }) {
  const ui = useUi();
  return (
    <div
      className="sticky top-0 z-10 flex h-12 items-center gap-1 bg-surface px-2 transition-shadow duration-[120ms]"
      style={{ boxShadow: scrolled ? "0 6px 14px -10px rgb(0 0 0 / 0.35)" : "none" }}
    >
      <button type="button" onClick={ui.back} aria-label="뒤로" className="grid size-10 place-items-center rounded-work hover:bg-sunken">
        <Icon name="back" />
      </button>
      <AnimatePresence initial={false}>
        {showTitle && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={quick}
            className="title min-w-0 flex-1 truncate pr-12 text-center text-[17px]"
          >
            {title}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
