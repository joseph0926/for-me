// 가계부 앱 "살림장". 내역 배열 하나를 세 탭이 함께 읽는다.
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { AddSheet } from "./components/AddSheet";
import { type Tab, TabBar } from "./components/TabBar";
import { type Entry, TODAY, initialEntries } from "./data";
import type { DateKey } from "./dates";
import { AnalysisScreen } from "./screens/AnalysisScreen";
import { BudgetScreen } from "./screens/BudgetScreen";
import { LedgerScreen } from "./screens/LedgerScreen";

export function App() {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [tab, setTab] = useState<Tab>("ledger");
  const [selectedDate, setSelectedDate] = useState<DateKey>(TODAY);
  const [isAdding, setIsAdding] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const addEntry = (entry: Omit<Entry, "id">) => {
    const id = `new-${crypto.randomUUID()}`;
    setEntries((current) => [...current, { ...entry, id }]);
    setHighlightId(id);
    setIsAdding(false);
  };

  return (
    <div className="flex h-full flex-col">
      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="h-full"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
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
      <TabBar current={tab} onChange={setTab} />

      <AnimatePresence>
        {isAdding && <AddSheet key="add" date={selectedDate} onClose={() => setIsAdding(false)} onSave={addEntry} />}
      </AnimatePresence>
    </div>
  );
}
