import type { Guests } from "../search";
import { MinusIcon, PlusIcon } from "./icons";

const MAX_GUESTS = 8;

export function GuestStepper({ guests, onChange }: { guests: Guests; onChange: (guests: Guests) => void }) {
  const total = guests.adults + guests.children;
  const rows: { key: keyof Guests; label: string; detail: string; min: number }[] = [
    { key: "adults", label: "성인", detail: "만 13세 이상", min: 1 },
    { key: "children", label: "아동", detail: "만 12세 이하", min: 0 },
  ];

  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const value = guests[row.key];
        return (
          <div key={row.key} className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-medium">{row.label}</p>
              <p className="text-[13px] text-muted">{row.detail}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`${row.label} 줄이기`}
                disabled={value <= row.min}
                onClick={() => onChange({ ...guests, [row.key]: value - 1 })}
                className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-ink hover:border-ink disabled:border-line disabled:text-line-strong"
              >
                <MinusIcon size={16} />
              </button>
              <span className="tabular w-5 text-center text-[15px]">{value}</span>
              <button
                type="button"
                aria-label={`${row.label} 늘리기`}
                disabled={total >= MAX_GUESTS}
                onClick={() => onChange({ ...guests, [row.key]: value + 1 })}
                className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-ink hover:border-ink disabled:border-line disabled:text-line-strong"
              >
                <PlusIcon size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
