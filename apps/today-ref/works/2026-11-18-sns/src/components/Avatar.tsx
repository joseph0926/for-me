import type { User } from "../data";

// 사진 대신 낮은 채도의 바탕에 이름 글자를 둔다. 사진처럼 테마와 무관하게 같은 색을 쓴다.
const tones = [
  { background: "#d8c8b4", color: "#5a4632" },
  { background: "#c3cfd9", color: "#3b4b59" },
  { background: "#cdd6c3", color: "#45523a" },
  { background: "#dcc4c4", color: "#5c3d3d" },
  { background: "#cbc6dc", color: "#45405c" },
  { background: "#e2d8b2", color: "#5b5232" },
  { background: "#b9cbc6", color: "#34504a" },
  { background: "#d6ccc4", color: "#4f453d" },
];

export function Avatar({ user, size }: { user: User; size: number }) {
  const tone = tones[user.avatarTone % tones.length];
  // 성을 뺀 이름 첫 글자가 서로 덜 겹친다.
  const initial = user.name.length > 1 ? user.name[1] : user.name;

  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 select-none place-items-center rounded-full font-semibold shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.08)]"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        ...tone,
      }}
    >
      {initial}
    </span>
  );
}
