// 사진 아래 수평 다이얼(r3). 눈금 줄을 좌우로 끌어 -45~45도를 고르고, 두 번 누르면 0도로 돌아온다.
import { useRef } from "react";

interface StraightenDialProps {
  value: number;
  onChange: (value: number) => void;
  onCommit: () => void;
  // 자른 결과의 픽셀 크기 이름표(r3).
  size: string;
}

const pxPerDegree = 6;
const limit = 45;

export function StraightenDial({ value, onChange, onCommit, size }: StraightenDialProps) {
  const drag = useRef<{ x: number; start: number } | null>(null);
  const set = (next: number) => onChange(Math.round(Math.max(-limit, Math.min(limit, next)) * 10) / 10);

  return (
    <div className="mt-5 flex w-full max-w-[420px] flex-col items-center gap-1.5 text-white" onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex items-baseline gap-3 text-[13px] tabular-nums text-white/70">
        <span className="text-[14px] font-[650] text-white">{value.toFixed(1)}°</span>
        <span>{size}</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="수평 맞추기"
        aria-valuemin={-limit}
        aria-valuemax={limit}
        aria-valuenow={value}
        aria-valuetext={`${value.toFixed(1)}도`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, start: value };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          // 오른쪽으로 끌면 눈금이 왼쪽으로 지나가며 각도가 커진다.
          set(drag.current.start - (event.clientX - drag.current.x) / pxPerDegree);
        }}
        onPointerUp={() => {
          drag.current = null;
          onCommit();
        }}
        onDoubleClick={() => {
          set(0);
          onCommit();
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 1 : 0.1;
          if (event.key === "ArrowLeft") set(value - step);
          if (event.key === "ArrowRight") set(value + step);
          if (event.key === "0") set(0);
        }}
        onKeyUp={onCommit}
        className="relative h-9 w-full cursor-ew-resize touch-none overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]"
      >
        <div className="absolute top-0 left-1/2 h-full" style={{ transform: `translateX(${-value * pxPerDegree}px)` }}>
          {Array.from({ length: limit * 2 + 1 }, (_, i) => {
            const degree = i - limit;
            const major = degree % 15 === 0;
            const medium = degree % 5 === 0;
            return (
              <span
                key={degree}
                className={`absolute top-1/2 w-px -translate-y-1/2 ${major ? "h-5 bg-white/80" : medium ? "h-3.5 bg-white/55" : "h-2 bg-white/35"}`}
                style={{ left: degree * pxPerDegree }}
              />
            );
          })}
        </div>
        <span className="absolute top-0.5 bottom-0.5 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-white" />
      </div>
    </div>
  );
}
