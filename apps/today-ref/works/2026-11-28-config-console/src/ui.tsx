// 화면들이 함께 쓰는 작은 부품. 버튼은 주 버튼과 보조 버튼 두 벌과, 덜 중요한 동작의 밑줄 글자만 둔다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

import { menu } from "./motion";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" };

export function Button({ tone = "secondary", className = "", ...props }: ButtonProps) {
  const look =
    tone === "primary"
      ? "bg-accent text-accent-ink border-accent enabled:hover:brightness-[.88]"
      : "bg-transparent text-ink border-line-strong enabled:hover:bg-panel";
  return (
    <button
      type="button"
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-work border px-3.5 text-[14px] font-semibold whitespace-nowrap transition-[filter,background-color,scale] duration-120 ease-out enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:enabled:active:scale-100 ${look} ${className}`}
      {...props}
    />
  );
}

// 덜 중요한 동작: 바탕 없이 보조색 글자에 1px 밑줄
export function QuietButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 text-[14px] text-muted underline decoration-1 underline-offset-[3px] hover:text-ink ${className}`}
      {...props}
    />
  );
}

// 36px 정사각형에 바탕 없이 아이콘만 두고, 올리면 옅은 면을 깐다.
export function IconButton({ label, icon, onClick, small = false }: { label: string; icon: string; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid shrink-0 place-items-center rounded-work text-muted hover:bg-surface hover:text-ink ${small ? "size-7" : "size-9"}`}
    >
      <Icon name={icon} className={small ? "size-3.5" : "size-4"} />
    </button>
  );
}

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const filled = checked || indeterminate;
  return (
    <span className="relative inline-grid size-4 shrink-0 place-items-center transition-[scale] duration-160 ease-out has-[:active]:scale-[.86] motion-reduce:has-[:active]:scale-100">
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`size-4 cursor-pointer appearance-none rounded-[3px] border transition-colors duration-160 ${
          filled ? "border-accent bg-accent" : "border-line-strong bg-panel"
        }`}
      />
      {filled && (
        <svg viewBox="0 0 16 16" className="pointer-events-none absolute size-3 text-accent-ink" aria-hidden>
          {indeterminate ? (
            <path d="M3.5 8h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      )}
    </span>
  );
}

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

// 버튼을 누르면 버튼 쪽 모서리에서 펼쳐지는 고르기 메뉴. 가리킨 항목을 옅은 면이 따라가고, 바깥을 누르거나 Escape로 닫는다.
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  prefix,
  align = "start",
  joined = "",
  ariaLabel,
}: {
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  prefix?: ReactNode;
  align?: "start" | "end";
  joined?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pointed, setPointed] = useState<T | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const highlighted = pointed ?? value;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setPointed(null);
          setOpen((was) => !was);
        }}
        className={`inline-flex h-9 items-center gap-1.5 border border-line-strong bg-transparent px-3 text-[14px] font-medium whitespace-nowrap hover:bg-panel ${
          joined || "rounded-work"
        }`}
      >
        {prefix}
        {current?.label}
        <Icon name="chevron" className="size-3.5 text-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={menu}
            style={{ transformOrigin: align === "end" ? "top right" : "top left" }}
            onPointerLeave={() => setPointed(null)}
            className={`absolute top-full z-30 mt-1 min-w-40 rounded-work border border-line bg-panel p-1 shadow-[0_8px_24px_rgb(0_0_0/0.12)] ${
              align === "end" ? "right-0" : "left-0"
            }`}
          >
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value} className="relative">
                  {highlighted === option.value && (
                    <motion.span
                      layoutId={`${ariaLabel}-pointed`}
                      transition={menu}
                      aria-hidden
                      className="absolute inset-0 rounded-[3px] bg-surface"
                    />
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onPointerEnter={() => setPointed(option.value)}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="relative flex h-[30px] w-full items-center gap-2 px-2 text-left text-[14px]"
                  >
                    <span className="w-3.5 shrink-0 text-accent">{selected && <Icon name="check" className="size-3.5" />}</span>
                    <span className={selected ? "font-semibold text-accent" : ""}>{option.label}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const paths: Record<string, ReactNode> = {
  chevron: <path d="m4 6 4 4 4-4" />,
  check: <path d="m3.5 8.5 3 3 6-7" />,
  close: <path d="m4 4 8 8M12 4l-8 8" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </>
  ),
  sort: <path d="M5 3v10M2.5 10.5 5 13l2.5-2.5M11 13V3M8.5 5.5 11 3l2.5 2.5" />,
  sliders: <path d="M3 4.5h10M3 11.5h10M6 3v3M10 10v3" />,
  upload: <path d="M8 12V3M4.5 6.5 8 3l3.5 3.5M3 13h10" />,
  arrow: <path d="M3 8h10M9.5 4.5 13 8l-3.5 3.5" />,
  swap: <path d="M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13" />,
  warn: (
    <>
      <path d="M8 2.5 14 13H2Z" />
      <path d="M8 6.5v3M8 11.3v.2" />
    </>
  ),
  alert: (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 5v3.4M8 10.8v.2" />
    </>
  ),
  back: <path d="M13 8H3M6.5 4.5 3 8l3.5 3.5" />,
  plus: <path d="M8 3v10M3 8h10" />,
  retry: <path d="M12.5 5.5A5 5 0 1 0 13 9M12.5 2.5v3h-3" />,
};

export function Icon({ name, className = "size-4" }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
