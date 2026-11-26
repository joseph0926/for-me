// 전체 폭 재생바. 끄는 동안 손잡이 위에 시간 말풍선을 띄운다.
// 가로 보기에서는 화면을 90도 돌려 그리므로 화면 기준 세로 방향 움직임이 재생바의 진행 방향이다.
import { type PointerEvent, useRef } from "react";

import { formatTime } from "../format";

export function Scrubber({
  time,
  duration,
  scrubbing,
  landscape,
  onScrubStart,
  onScrub,
  onScrubEnd,
}: {
  time: number;
  duration: number;
  scrubbing: boolean;
  landscape: boolean;
  onScrubStart: (time: number) => void;
  onScrub: (time: number) => void;
  onScrubEnd: (time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  // 누르고 바로 끌면 scrubbing prop이 아직 바뀌기 전이므로 끄는 중인지는 ref로 판단한다.
  const draggingRef = useRef(false);
  const ratio = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0;

  const timeAt = (event: PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return time;
    const position = landscape ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, position)) * duration;
  };

  return (
    <div
      role="slider"
      aria-label="재생 위치"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${formatTime(time)} / ${formatTime(duration)}`}
      tabIndex={0}
      className="pointer-events-auto relative -my-3 cursor-pointer touch-none py-3"
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        draggingRef.current = true;
        onScrubStart(timeAt(event));
      }}
      onPointerMove={(event) => {
        if (draggingRef.current) onScrub(timeAt(event));
      }}
      onPointerUp={(event) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        onScrubEnd(timeAt(event));
      }}
      onPointerCancel={() => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        onScrubEnd(time);
      }}
    >
      {/* tastepin 재생 조작 값: 평소 진행 막대는 3px, 끄는 동안만 굵힌다. */}
      <div ref={trackRef} className={`relative rounded-full bg-white/25 transition-[height] ${scrubbing ? "h-1.5" : "h-[3px]"}`}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${ratio * 100}%` }} />
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow transition-[width,height] ${scrubbing ? "size-4" : "size-3"}`}
          style={{ left: `${ratio * 100}%` }}
        />
        {scrubbing && (
          <div
            className="tabular absolute bottom-5 rounded-md bg-black/75 px-2 py-1 text-[13px] font-semibold whitespace-nowrap text-white"
            style={{ left: `${ratio * 100}%`, transform: `translateX(-${ratio * 100}%)` }}
          >
            {formatTime(time)}
          </div>
        )}
      </div>
    </div>
  );
}
