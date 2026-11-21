import type { Creator, FanUser } from "../data";
import { creatorAccent } from "./tone";

// 사진 대신 이름 첫 글자를 쓴다. 크리에이터는 자기 색, 팬은 낮은 채도의 바탕을 쓴다.
const fanTones = [
  { background: "#e3cdb8", color: "#5a4632" },
  { background: "#c6d3dc", color: "#3b4b59" },
  { background: "#d1dac6", color: "#45523a" },
  { background: "#e1c7c7", color: "#5c3d3d" },
  { background: "#cec9df", color: "#45405c" },
  { background: "#e5dab4", color: "#5b5232" },
  { background: "#bccec9", color: "#34504a" },
  { background: "#d9cfc7", color: "#4f453d" },
];

export function CreatorAvatar({ creator, size, ring }: { creator: Creator; size: number; ring?: "live" | "new" }) {
  const ringColor = ring === "live" ? "#ef3b4c" : creatorAccent(creator.hue);
  return (
    <span
      aria-hidden="true"
      className="relative grid shrink-0 select-none place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(140deg, hsl(${creator.hue} 72% 62%), hsl(${creator.hue + 28} 62% 38%))`,
        boxShadow: ring ? `0 0 0 2px var(--surface), 0 0 0 4px ${ringColor}` : undefined,
      }}
    >
      {creator.name.slice(0, 1)}
    </span>
  );
}

export function FanAvatar({ fan, size }: { fan: FanUser; size: number }) {
  const tone = fanTones[fan.tone % fanTones.length];
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 select-none place-items-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...tone }}
    >
      {fan.name.slice(0, 1)}
    </span>
  );
}
