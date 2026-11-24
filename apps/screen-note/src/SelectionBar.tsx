import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Region } from "./document";

type Size = { width: number; height: number };

export function SelectionBar({ bounds, space, children }: {
  bounds: Region; space: Size; children: ReactNode;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = bar.current!;
    function measure() {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const left = bounds.x + (bounds.width - size.width) / 2;
  const above = bounds.y - size.height - 8;
  const top = above >= 0 ? above : bounds.y + bounds.height + 8;
  return (
    <div ref={bar} className="selection-bar" role="group" aria-label="선택한 표시 설정" style={{
      left: Math.max(0, Math.min(left, space.width - size.width)),
      top: Math.max(0, Math.min(top, space.height - size.height)),
    }}>
      {children}
    </div>
  );
}
