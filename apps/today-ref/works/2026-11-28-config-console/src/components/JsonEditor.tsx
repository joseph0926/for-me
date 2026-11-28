// 줄 번호가 붙은 JSON 입력란(r2의 스키마 검증 칸). 줄 수만큼 높이를 늘려 안쪽 세로 스크롤을 두지 않는다.
export function JsonEditor({
  value,
  onChange,
  label,
  placeholder,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const lines = Math.max(value.split("\n").length, 3);
  return (
    <div
      className={`flex overflow-x-auto rounded-work border bg-surface font-mono text-[13px] leading-5 focus-within:ring-1 ${
        invalid ? "border-danger focus-within:ring-danger" : "border-line-strong focus-within:border-accent focus-within:ring-accent"
      }`}
    >
      <div aria-hidden className="shrink-0 border-r border-line px-2 py-2 text-right text-muted select-none">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>
      <textarea
        aria-label={label}
        aria-invalid={invalid}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        wrap="off"
        rows={lines}
        className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-2.5 py-2 placeholder:text-muted"
      />
    </div>
  );
}
