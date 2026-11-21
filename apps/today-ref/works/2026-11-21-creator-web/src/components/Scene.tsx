import type { CSSProperties } from "react";

import type { Motif } from "../data";

// 외부 사진 없이 CSS로 그린 사진 자리. 크리에이터 색상(hue)으로 물들이고 층을 아래에서 위 순서로 쌓는다.
const labels: Record<Motif, string> = {
  sun: "해가 뜨는 언덕",
  waves: "겹겹이 밀려오는 물결",
  stage: "조명이 켜진 합주실",
  bowl: "위에서 내려다본 국수 한 그릇",
  sketch: "손글씨 메모가 적힌 종이",
  window: "불 켜진 창문들",
  night: "별이 뜬 밤하늘",
};

function layers(motif: Motif, hue: number): CSSProperties[] {
  switch (motif) {
    case "sun":
      return [
        { inset: 0, background: `linear-gradient(180deg, hsl(${hue + 18} 80% 82%) 0%, hsl(${hue} 78% 68%) 55%, hsl(${hue - 12} 60% 52%) 100%)` },
        { left: "58%", top: "26%", width: "26%", aspectRatio: "1", borderRadius: "50%", background: `radial-gradient(circle, hsl(${hue + 30} 100% 94%) 0 48%, transparent 70%)` },
        { left: "-10%", right: "-10%", top: "62%", bottom: "-30%", borderRadius: "50% 50% 0 0", background: `hsl(${hue - 10} 42% 38%)` },
        { left: "30%", right: "-30%", top: "70%", bottom: "-30%", borderRadius: "50% 50% 0 0", background: `hsl(${hue - 14} 40% 28%)` },
      ];
    case "waves":
      return [
        { inset: 0, background: `linear-gradient(180deg, hsl(${hue + 120} 40% 86%), hsl(${hue + 150} 45% 70%))` },
        ...[0, 1, 2, 3].map((index) => ({
          left: "-10%",
          right: "-10%",
          top: `${38 + index * 15}%`,
          bottom: 0,
          borderRadius: "45% 55% 0 0",
          background: `hsl(${hue + 160} ${50 - index * 6}% ${58 - index * 9}%)`,
        })),
      ];
    case "stage":
      return [
        { inset: 0, background: `linear-gradient(180deg, hsl(${hue + 30} 40% 10%), hsl(${hue} 48% 18%))` },
        { left: "8%", top: 0, width: "40%", height: "100%", background: `linear-gradient(180deg, hsl(${hue} 90% 72% / 0.55), transparent 85%)`, clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)" },
        { left: "52%", top: 0, width: "40%", height: "100%", background: `linear-gradient(180deg, hsl(${hue + 140} 90% 72% / 0.45), transparent 85%)`, clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)" },
        { left: "14%", bottom: "8%", width: "16%", height: "26%", borderRadius: 4, background: "#15171c", boxShadow: "inset 0 0 0 3px #2a2d35" },
        { left: "70%", bottom: "8%", width: "18%", height: "30%", borderRadius: 4, background: "#15171c", boxShadow: "inset 0 0 0 3px #2a2d35" },
        { left: "40%", bottom: "8%", width: "20%", height: "14%", borderRadius: "50%", background: `radial-gradient(circle, hsl(${hue} 30% 70%) 0 30%, #22252c 32%)` },
        { left: 0, right: 0, bottom: 0, height: "9%", background: "#0c0d10" },
      ];
    case "bowl":
      return [
        { inset: 0, background: `repeating-linear-gradient(90deg, hsl(${hue - 60} 30% 62%) 0 14%, hsl(${hue - 60} 32% 58%) 14% 28%)` },
        { left: "20%", top: "12%", width: "60%", aspectRatio: "1", borderRadius: "50%", background: "#f4efe6", boxShadow: "0 10px 24px rgb(0 0 0 / 0.25)" },
        { left: "27%", top: "21%", width: "46%", aspectRatio: "1", borderRadius: "50%", background: `repeating-radial-gradient(circle at 46% 54%, hsl(${hue - 50} 60% 74%) 0 3px, hsl(${hue - 55} 55% 64%) 3px 6px)` },
        { left: "40%", top: "34%", width: "7%", aspectRatio: "1", borderRadius: "50%", background: `hsl(${hue} 52% 46%)` },
        { left: "50%", top: "42%", width: "6%", aspectRatio: "1", borderRadius: "50%", background: `hsl(${hue} 50% 40%)` },
        { left: "46%", top: "28%", width: "5%", aspectRatio: "1", borderRadius: "50%", background: `hsl(${hue} 55% 52%)` },
      ];
    case "sketch":
      return [
        { inset: 0, background: `hsl(${hue + 20} 30% 93%)` },
        { left: "12%", right: "12%", top: "10%", bottom: "10%", background: "repeating-linear-gradient(180deg, transparent 0 17px, hsl(210 30% 78%) 17px 18px), #fffdf7", boxShadow: "0 6px 16px rgb(0 0 0 / 0.15)", transform: "rotate(-3deg)" },
        ...[0, 1, 2, 3, 4, 5].map((index) => ({
          left: "22%",
          top: `${20 + index * 10.5}%`,
          width: `${38 + ((index * 17) % 30)}%`,
          height: "2.6%",
          borderRadius: 4,
          background: `hsl(${hue} 40% 30% / 0.75)`,
          transform: "rotate(-3deg)",
        })),
      ];
    case "window":
      return [
        { inset: 0, background: `linear-gradient(180deg, hsl(${hue} 40% 24%), hsl(${hue + 20} 46% 14%))` },
        {
          left: "10%",
          right: "10%",
          top: "14%",
          bottom: "14%",
          background: `repeating-linear-gradient(90deg, transparent 0 21%, hsl(${hue} 30% 12%) 21% 25%), repeating-linear-gradient(180deg, hsl(42 90% 70%) 0 20%, hsl(${hue} 30% 12%) 20% 26%)`,
          maskImage: "radial-gradient(ellipse at 40% 45%, #000 40%, rgb(0 0 0 / 0.35) 90%)",
        },
        { inset: 0, background: `radial-gradient(ellipse at 40% 45%, hsl(42 100% 70% / 0.25), transparent 60%)` },
      ];
    case "night":
      return [
        { inset: 0, background: `linear-gradient(180deg, hsl(${hue + 210} 50% 12%), hsl(${hue + 230} 46% 26%))` },
        { inset: 0, background: "radial-gradient(circle, #fff 0 1px, transparent 1.6px) 0 0 / 34px 28px, radial-gradient(circle, rgb(255 255 255 / 0.6) 0 0.8px, transparent 1.4px) 14px 11px / 46px 38px" },
        { left: "66%", top: "16%", width: "14%", aspectRatio: "1", borderRadius: "50%", background: "#f6f0d8", boxShadow: "-6px 4px 0 0 transparent, 0 0 30px rgb(246 240 216 / 0.5)" },
        { left: 0, right: 0, bottom: 0, height: "22%", background: `hsl(${hue + 220} 40% 8%)`, clipPath: "polygon(0 40%, 18% 20%, 34% 46%, 52% 10%, 70% 38%, 86% 18%, 100% 34%, 100% 100%, 0 100%)" },
      ];
  }
}

export function Scene({ motif, hue, className, style }: { motif: Motif; hue: number; className?: string; style?: CSSProperties }) {
  // 층이 절대 위치라 기준 상자가 필요하다. 호출자가 absolute로 깔 때는 그 위치를 그대로 쓴다.
  const position = className?.includes("absolute") ? "" : "relative";
  return (
    <div role="img" aria-label={labels[motif]} className={`${position} overflow-hidden ${className ?? ""}`} style={style}>
      {layers(motif, hue).map((layer, index) => (
        <span key={index} className="absolute" style={layer} />
      ))}
    </div>
  );
}
