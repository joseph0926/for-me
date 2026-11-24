// 사진 대신 이름 첫 글자와 사람마다 정한 색으로 그린 아바타.
import type { User } from "../data";

export function Avatar({ user, size = 40, ring = false }: { user: User; size?: number; ring?: boolean }) {
  const { hue } = user;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-[650] select-none ${ring ? "ring-4 ring-[var(--surface)]" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: `light-dark(hsl(${hue} 55% 86%), hsl(${hue} 30% 26%))`,
        color: `light-dark(hsl(${hue} 45% 28%), hsl(${hue} 60% 82%))`,
      }}
    >
      {user.name.slice(0, 1)}
    </span>
  );
}

// 프로필 배너. 사람마다 정한 색을 두 갈래로 벌려 그라데이션을 만든다.
export function bannerBackground(hue: number) {
  return `linear-gradient(120deg, light-dark(hsl(${hue} 60% 78%), hsl(${hue} 35% 22%)), light-dark(hsl(${(hue + 40) % 360} 55% 88%), hsl(${(hue + 40) % 360} 30% 15%)))`;
}
