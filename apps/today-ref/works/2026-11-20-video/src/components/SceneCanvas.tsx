import { useEffect, useRef } from "react";

import type { Video } from "../data";
import { drawScene } from "../scene";

// 썸네일과 재생 화면이 함께 쓰는 16:9 캔버스. width는 캔버스의 실제 픽셀 폭이다.
export function SceneCanvas({
  video,
  time,
  width = 320,
  className = "",
}: {
  video: Video;
  time: number;
  width?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const height = Math.round((width * 9) / 16);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, width, height, video, time);
  }, [video, time, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className={`block ${className}`} aria-hidden="true" />;
}
