import Konva from "konva";
import { Circle, Group, Line, Rect, Text } from "react-konva";
import type { Mark, Memo, PenStyle, Point, Region } from "./document";

import { handles, outlineBounds } from "./resize";

const textStyle = { fontFamily: "Pretendard, sans-serif", lineHeight: 1.3 };

export function layoutMemo(
  content: Pick<Memo, "text" | "fontSize" | "bold" | "color">, point: Point, view: Region,
): Memo {
  const text = new Konva.Text({
    ...textStyle, text: content.text, fontSize: content.fontSize, fontStyle: content.bold ? "bold" : "normal",
  });
  const width = Math.min(view.width, Math.max(1, Math.ceil(text.width())));
  text.width(width);
  const height = text.height();
  text.destroy();
  const x = Math.max(view.x, Math.min(point.x, view.x + view.width - width));
  const y = Math.max(view.y, Math.min(point.y, view.y + view.height - height));
  return { tool: "memo", text: content.text, fontSize: content.fontSize, bold: content.bold,
    color: content.color, area: { x, y, width, height } };
}

export function PenPath({ x, y, points, color, strokeWidth }: Point & PenStyle & { points: number[] }) {
  if (points.length === 2) return <Circle x={x + points[0]} y={y + points[1]} radius={strokeWidth / 2} fill={color} />;
  return <Line x={x} y={y} points={points} stroke={color} strokeWidth={strokeWidth} lineCap="round" lineJoin="round" />;
}

export function MarkShape({ mark }: { mark: Mark }) {
  if (mark.tool === "pen") return <PenPath {...mark.area} points={mark.points} color={mark.color} strokeWidth={mark.strokeWidth} />;
  if (mark.tool === "memo") {
    const layoutSize = mark.layoutFontSize ?? mark.fontSize;
    const zoom = mark.fontSize / layoutSize;
    return <Text {...textStyle} x={mark.area.x} y={mark.area.y} width={mark.area.width / zoom} scaleX={zoom} scaleY={zoom} text={mark.text}
      fontSize={layoutSize} fontStyle={mark.bold ? "bold" : "normal"}
      fill={mark.color} stroke="#17191e" strokeWidth={layoutSize * 0.16}
      lineJoin="round" fillAfterStrokeEnabled />;
  }
  if (mark.tool === "cover") return <Rect {...mark.area} fill={mark.color} />;
  return <Rect {...mark.area} stroke={mark.color} strokeWidth={mark.strokeWidth} />;
}

export function MarkOutline({ mark, scale, view }: { mark: Mark; scale: number; view: Region }) {
  const bounds = outlineBounds(mark, scale);
  return (
    <Group listening={false}>
      <Rect {...bounds} stroke="#3575cb" strokeWidth={1 / scale} />
      {mark.tool !== "pen" && handles(mark, scale, view).map(({ corner, x, y }) => (
        <Rect key={corner.id} x={x - 4 / scale} y={y - 4 / scale} width={8 / scale} height={8 / scale}
          fill="white" stroke="#3575cb" strokeWidth={1 / scale} />
      ))}
    </Group>
  );
}
