// 안 본 영상 표시. tastepin 배지 값대로 면과 테두리 없이 6px 점과 글자만 두고,
// 상태 표시라 점만 강조색을 쓴다. 홈과 보관함이 같은 모양을 쓴다.
export function NewMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-muted ${className}`}>
      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
      새 영상
    </span>
  );
}
