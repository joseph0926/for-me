// 지금 곡 표시. 재생 중에만 막대가 움직인다.
export function Level({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={`level inline-flex h-3 items-end gap-[2px] ${className ?? ""}`} data-paused={!playing} aria-hidden="true">
      <span className="h-full w-[3px] rounded-[1px] bg-current" />
      <span className="h-full w-[3px] rounded-[1px] bg-current" />
      <span className="h-full w-[3px] rounded-[1px] bg-current" />
    </span>
  );
}
