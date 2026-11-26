// 가계부 앱 "살림장". 내역 배열 하나를 세 탭이 함께 읽는다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { AddSheet } from "./components/AddSheet";
import { type Tab, TabBar, tabOrder } from "./components/TabBar";
import { type Entry, TODAY, initialEntries } from "./data";
import type { DateKey } from "./dates";
import { easeOut, slideVariants } from "./motion";
import { AnalysisScreen } from "./screens/AnalysisScreen";
import { BudgetScreen } from "./screens/BudgetScreen";
import { LedgerScreen } from "./screens/LedgerScreen";

export function App() {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [tab, setTab] = useState<Tab>("ledger");
  // 탭 순서에서 오른쪽으로 가면 1, 왼쪽으로 가면 -1. 화면이 들고 나는 방향을 정한다.
  const [direction, setDirection] = useState(1);
  const [selectedDate, setSelectedDate] = useState<DateKey>(TODAY);
  const [isAdding, setIsAdding] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // 칠하기가 끝나면 표시를 지운다. 남겨 두면 그 날짜로 돌아올 때마다 같은 내역이 다시 들어오며 칠해진다.
  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 1600);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const addEntry = (entry: Omit<Entry, "id">) => {
    const id = `new-${crypto.randomUUID()}`;
    setEntries((current) => [...current, { ...entry, id }]);
    setHighlightId(id);
    setIsAdding(false);
  };

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    setDirection(tabOrder.indexOf(next) > tabOrder.indexOf(tab) ? 1 : -1);
    setTab(next);
  };

  return (
    <div className="flex h-full flex-col">
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {/* tastepin 화면 전환 값: 탭 방향으로 24px 밀리며 2px 흐림을 거치고, 나가는 화면과 들어오는 화면이 240ms 동안 겹친다. */}
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={tab}
            className="h-full w-full"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.24, ease: easeOut }}
          >
            {tab === "ledger" && (
              <LedgerScreen
                entries={entries}
                selectedDate={selectedDate}
                highlightId={highlightId}
                onSelectDate={setSelectedDate}
                onOpenAdd={() => setIsAdding(true)}
              />
            )}
            {tab === "budget" && <BudgetScreen entries={entries} />}
            {tab === "analysis" && <AnalysisScreen entries={entries} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar current={tab} onChange={changeTab} />

      <AnimatePresence>
        {isAdding && <AddSheet key="add" date={selectedDate} onClose={() => setIsAdding(false)} onSave={addEntry} />}
      </AnimatePresence>
    </div>
  );
}
