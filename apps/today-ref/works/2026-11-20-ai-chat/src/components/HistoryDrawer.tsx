// 왼쪽에서 열리는 지난 대화 목록. 오늘, 어제, 지난 7일로 묶는다.
import { motion } from "motion/react";
import { useState } from "react";

import type { Conversation } from "../chat";
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
  const [query, setQuery] = useState("");
  const keyword = query.trim();
  const visible = keyword ? conversations.filter((conversation) => conversation.title.includes(keyword)) : conversations;

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
      />
      <motion.nav
        aria-label="지난 대화"
        className="absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col bg-surface"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 42 }}
      >
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-full bg-raised px-3 text-muted">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="대화 검색"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </label>
          <button type="button" onClick={onNewChat} aria-label="새 대화" className="grid size-10 place-items-center rounded-full">
            <Icon name="compose" />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {groups.map((group) => {
            const items = visible.filter((conversation) => group.test(conversation.daysAgo));
            if (items.length === 0) return null;
            return (
              <section key={group.label} className="mt-3">
                <h2 className="px-3 pb-1 text-[12px] font-medium text-muted">{group.label}</h2>
                <ul>
                  {items.map((conversation) => {
                    const selected = conversation.id === currentId;
                    return (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(conversation.id)}
                          aria-current={selected ? "page" : undefined}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] ${selected ? "bg-raised font-semibold" : ""}`}
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
          {visible.length === 0 && <p className="px-3 pt-6 text-center text-[13px] text-muted">"{keyword}"가 들어간 대화가 없어요.</p>}
        </div>
      </motion.nav>
    </div>
  );
}
