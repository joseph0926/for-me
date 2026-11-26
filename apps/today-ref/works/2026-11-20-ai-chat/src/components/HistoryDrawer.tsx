// 왼쪽에서 열리는 지난 대화 목록. 오늘, 어제, 지난 7일로 묶는다.
// 대화가 몇 개뿐이라 검색 칸 없이 목록 하나로 둔다(2026-11-26 tastepin 다듬기에서 뺌).
import { motion } from "motion/react";

import type { Conversation } from "../chat";
import { panel } from "../motion";
import { Icon } from "./Icon";

const groups: { label: string; test: (daysAgo: number) => boolean }[] = [
  { label: "오늘", test: (days) => days === 0 },
  { label: "어제", test: (days) => days === 1 },
  { label: "지난 7일", test: (days) => days > 1 },
];

export function HistoryDrawer({
  conversations,
  currentId,
  generatingId,
  onOpen,
  onNewChat,
  onClose,
}: {
  conversations: Conversation[];
  currentId: string | null;
  generatingId: string | null;
  onOpen: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40">
      <motion.button
        type="button"
        aria-label="대화 목록 닫기"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={panel}
      />
      <motion.nav
        aria-label="지난 대화"
        className="absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col bg-surface"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        // 가장자리에서 들어오는 서랍은 스프링 없이 300ms 곡선으로 열고 같은 길로 닫는다(tastepin 드로어 예외)
        transition={panel}
      >
        <div className="px-2 pt-3">
          <button type="button" onClick={onNewChat} className="question-row flex w-full items-center gap-2 rounded-md px-3 py-[11px] text-left text-[15px] font-semibold">
            <Icon name="compose" size={18} />새 대화
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {groups.map((group) => {
            const items = conversations.filter((conversation) => group.test(conversation.daysAgo));
            if (items.length === 0) return null;
            return (
              // 묶음은 선 없이 28px 여백과 묶음 제목으로 나눈다(tastepin 묶음 나누기 값)
              <section key={group.label} className="mt-7 first:mt-4">
                <h2 className="px-3 pb-1 text-[13px] font-semibold text-muted">{group.label}</h2>
                <ul>
                  {items.map((conversation) => {
                    // 지금 대화는 이 앱의 선택 표시인 이끼 초록 면으로, 마우스를 올린 행은 회색 면으로 둬 서로 헷갈리지 않게 한다
                    const selected = conversation.id === currentId;
                    return (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(conversation.id)}
                          aria-current={selected ? "page" : undefined}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-[11px] text-left text-[15px] ${selected ? "bg-accent-soft font-semibold" : "question-row"}`}
                        >
                          <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                          {conversation.id === generatingId && <span className="spinner shrink-0" aria-label="답을 쓰는 중" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
