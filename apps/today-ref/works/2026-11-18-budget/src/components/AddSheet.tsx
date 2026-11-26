// 내역 추가 시트: 지출과 수입 전환, 숫자 키패드로 금액 입력, 분류와 메모.
import { motion } from "motion/react";
import { useState } from "react";

import { type Entry, type EntryKind, categories } from "../data";
import { type DateKey, parseDateKey, weekdayName } from "../dates";
import { plain } from "../ledger";
import { easeOut, smallSpring } from "../motion";
import { CategoryDot } from "./CategoryDot";

// 바텀 시트(tastepin 드로어 예외): 스프링 없이 300ms 곡선으로 올라오고 같은 길을 같은 길이로 내려간다.
const sheetTransition = { duration: 0.3, ease: easeOut };

// 10자리(99억 원대)까지만 받는다.
const maxDigits = 10;

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"] as const;

interface Props {
  date: DateKey;
  onClose: () => void;
  onSave: (entry: Omit<Entry, "id">) => void;
}

function firstCategoryOf(kind: EntryKind) {
  const category = categories.find((item) => item.kind === kind);
  if (!category) throw new Error(`${kind} 분류가 없습니다`);
  return category.id;
}

export function AddSheet({ date, onClose, onSave }: Props) {
  const [kind, setKind] = useState<EntryKind>("expense");
  const [digits, setDigits] = useState("");
  const [categoryId, setCategoryId] = useState(firstCategoryOf("expense"));
  const [memo, setMemo] = useState("");

  const amount = Number(digits || "0");
  const kindCategories = categories.filter((category) => category.kind === kind);
  const { month, day } = parseDateKey(date);

  const changeKind = (next: EntryKind) => {
    setKind(next);
    setCategoryId(firstCategoryOf(next));
  };

  const press = (key: (typeof keys)[number]) => {
    if (key === "back") {
      setDigits((current) => current.slice(0, -1));
      return;
    }
    setDigits((current) => {
      const next = current === "" && key.startsWith("0") ? "" : current + key;
      return next.length > maxDigits ? current : next;
    });
  };

  const save = () => {
    if (amount <= 0) return;
    onSave({ date, kind, amount, categoryId, memo: memo.trim() });
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      {/* 뒤 화면을 누르면 닫는다. 닫기 단추는 시트 안의 X 하나로 두고, 덮개는 화면 읽기 프로그램에 드러내지 않는다. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={sheetTransition}
        onClick={onClose}
      />
      <motion.section
        role="dialog"
        aria-label="내역 추가"
        className="relative flex max-h-full flex-col rounded-t-[6px] bg-[var(--surface)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={sheetTransition}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-[14px] text-[var(--muted)]">
            {month}월 {day}일 {weekdayName(date)}요일
          </span>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid size-8 place-items-center rounded-[6px] text-[var(--muted)]">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 고른 쪽 면이 같은 노드로 옆 칸까지 미끄러진다(tastepin 규칙: 바뀌었다는 표시는 누른 컨트롤 쪽에 둔다). */}
        <div className="mx-5 mt-2 grid grid-cols-2 rounded-[6px] bg-[var(--panel)] p-1 text-[14px] font-semibold">
          {(["expense", "income"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeKind(option)}
              aria-pressed={kind === option}
              className={`relative rounded-[4px] py-2 ${kind === option ? "" : "text-[var(--muted)]"}`}
              style={kind === option ? { color: option === "expense" ? "var(--expense)" : "var(--income)" } : undefined}
            >
              {kind === option && (
                <motion.span
                  layoutId="kind-indicator"
                  className="absolute inset-0 rounded-[4px] bg-[var(--surface)] shadow-sm"
                  transition={smallSpring}
                />
              )}
              <span className="relative">{option === "expense" ? "지출" : "수입"}</span>
            </button>
          ))}
        </div>

        <p
          className="px-5 pt-5 text-right text-[34px] font-bold"
          style={{ color: amount > 0 ? (kind === "expense" ? "var(--expense)" : "var(--income)") : "var(--faint)" }}
          aria-live="polite"
        >
          {plain(amount)}원
        </p>

        {/* 분류는 줄을 넘겨 모두 보이게 둔다. 가로 스크롤 한 줄이면 생활, 문화, 주거 통신이 화면 밖에 숨는다. */}
        <div role="group" aria-label="분류" className="flex flex-wrap gap-2 px-5 pt-4">
          {kindCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              aria-pressed={category.id === categoryId}
              className={`flex h-9 items-center gap-2 rounded-[6px] border px-3 text-[14px] ${
                category.id === categoryId ? "border-[var(--ink)] font-semibold" : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              <CategoryDot categoryId={category.id} size={8} />
              {category.name}
            </button>
          ))}
        </div>

        <label className="mx-5 mt-3 flex items-center gap-3 border-b border-[var(--line)] py-2 text-[14px]">
          <span className="text-[var(--muted)]">메모</span>
          <input
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            maxLength={30}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--faint)]"
          />
        </label>

        <div className="mt-3 grid grid-cols-3 px-3">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              aria-label={key === "back" ? "지우기" : key}
              className="grid h-[52px] place-items-center rounded-[6px] text-[22px] font-medium active:bg-[var(--panel)]"
            >
              {key === "back" ? (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                  <path d="M9 6h11v12H9l-6-6 6-6z" />
                  <path d="M12 10l4 4M16 10l-4 4" strokeLinecap="round" />
                </svg>
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        <div className="px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
          <button
            type="button"
            onClick={save}
            disabled={amount <= 0}
            className="h-12 w-full rounded-[6px] bg-[var(--accent)] text-[16px] font-semibold text-white disabled:bg-[var(--panel)] disabled:text-[var(--faint)]"
          >
            저장
          </button>
        </div>
      </motion.section>
    </div>
  );
}
