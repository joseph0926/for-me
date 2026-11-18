import type { PackStyle } from "../data";

const styles: Record<PackStyle, { background: string; foil: string }> = {
  bronze: { background: "linear-gradient(150deg, #6b4a2f, #2a1d14)", foil: "#c88b57" },
  gold: { background: "linear-gradient(150deg, #8a6a1e, #2b220b)", foil: "#f2c14e" },
  rare: { background: "linear-gradient(150deg, #1d5f8a, #0c1d2c)", foil: "#49c6ff" },
  hero: { background: "linear-gradient(150deg, #a5461c, #2a0f16 70%)", foil: "#ff9f43" },
  free: { background: "linear-gradient(150deg, #2c3446, #12161f)", foil: "#9aa3b5" },
};

// 팩 그림: 겹친 카드 세 장과 장 수. 실제 게임 그림 대신 색과 모양으로 등급을 나눈다.
export function PackArt({ style, size, className = "" }: { style: PackStyle; size: number; className?: string }) {
  const { background, foil } = styles[style];
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background }}>
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: `repeating-linear-gradient(120deg, transparent 0 14px, ${foil}22 14px 15px)` }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative h-[62%] aspect-[3/4]">
          {[-14, 0, 14].map((rotate, index) => (
            <div
              key={rotate}
              className="absolute inset-0 rounded-lg border shadow-xl"
              style={{
                transform: `rotate(${rotate}deg) translateX(${(index - 1) * 18}%)`,
                borderColor: `${foil}aa`,
                background: index === 1 ? `linear-gradient(160deg, ${foil}, ${foil}55)` : `linear-gradient(160deg, ${foil}66, #0006)`,
              }}
            />
          ))}
        </div>
      </div>
      <span className="absolute top-2.5 right-2.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[11px] font-bold tabular text-white">
        {size}장
      </span>
    </div>
  );
}
