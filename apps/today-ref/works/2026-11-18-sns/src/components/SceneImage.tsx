import type { CSSProperties } from "react";

import type { Scene } from "../data";

// 외부 사진 없이 CSS로 그린 사진 자리. 장면마다 겹친 층을 위에서 아래 순서로 둔다.
type Layer = CSSProperties;

const sceneLabels: Record<Scene, string> = {
  "dusk-river": "노을 진 강과 다리",
  "film-sea": "평일 오전의 바다와 모래사장",
  lighthouse: "방파제 끝의 등대",
  "night-street": "가로등이 켜진 밤 골목",
  bookshelf: "책이 꽂힌 나무 책장",
};

const sceneLayers: Record<Scene, Layer[]> = {
  "dusk-river": [
    { inset: 0, background: "linear-gradient(180deg,#f3c6a0 0%,#eda27f 30%,#c98184 48%,#8d6f8e 58%)" },
    {
      left: "38%",
      top: "26%",
      width: "60%",
      height: "36%",
      background: "radial-gradient(ellipse at center, rgb(255 226 176 / 0.6), transparent 70%)",
    },
    {
      left: "63%",
      top: "43%",
      width: "10%",
      aspectRatio: "1",
      borderRadius: "50%",
      background: "radial-gradient(circle, #fff4d8 0 46%, rgb(255 236 190 / 0) 72%)",
    },
    {
      left: 0,
      right: 0,
      top: "49%",
      height: "10%",
      background: "#4b3f5d",
      clipPath:
        "polygon(0 72%,6% 72%,6% 34%,10% 34%,10% 56%,15% 56%,15% 12%,19% 12%,19% 62%,26% 62%,26% 42%,31% 42%,31% 76%,40% 76%,40% 46%,43% 46%,43% 22%,46% 22%,46% 66%,55% 66%,55% 52%,61% 52%,61% 80%,72% 80%,72% 36%,76% 36%,76% 60%,84% 60%,84% 26%,88% 26%,88% 70%,100% 70%,100% 100%,0 100%)",
    },
    { left: 0, right: 0, top: "59%", bottom: 0, background: "linear-gradient(180deg,#5d5572 0%,#3a3a55 40%,#22243a 100%)" },
    {
      left: "60%",
      top: "59%",
      width: "16%",
      bottom: 0,
      background: "repeating-linear-gradient(180deg, rgb(255 214 170 / 0.55) 0 2px, transparent 2px 7px)",
      maskImage: "linear-gradient(180deg, #000, transparent 85%)",
    },
    { left: 0, right: 0, top: "57.4%", height: "1.6%", background: "#2c2638" },
    {
      left: 0,
      right: 0,
      top: "59%",
      height: "4.5%",
      background: "repeating-linear-gradient(90deg, transparent 0 11%, #2c2638 11% 12.6%)",
    },
  ],
  "film-sea": [
    { inset: 0, background: "linear-gradient(180deg,#c3d1d8 0%,#dde4e2 44%)" },
    { left: 0, right: 0, top: "44%", height: "25%", background: "linear-gradient(180deg,#577f8b 0%,#7aa3a8 60%,#a5c3c0 100%)" },
    {
      left: 0,
      right: 0,
      top: "66%",
      height: "4%",
      background: "linear-gradient(180deg, transparent, rgb(255 255 255 / 0.85), transparent)",
    },
    { left: 0, right: 0, top: "69%", bottom: 0, background: "linear-gradient(180deg,#dccdb2,#c6b391)" },
    { inset: 0, background: "radial-gradient(ellipse at center, transparent 55%, rgb(60 50 40 / 0.22) 100%)" },
  ],
  lighthouse: [
    { inset: 0, background: "linear-gradient(180deg,#a9c1cf 0%,#dfe8ec 60%)" },
    { left: 0, right: 0, top: "60%", bottom: 0, background: "linear-gradient(180deg,#3f6274,#2a4656)" },
    {
      left: 0,
      right: 0,
      top: "56%",
      bottom: 0,
      background: "#8d9296",
      clipPath: "polygon(0 30%, 62% 18%, 70% 22%, 70% 100%, 0 100%)",
    },
    {
      left: "56%",
      top: "24%",
      width: "12%",
      height: "40%",
      background: "linear-gradient(90deg,#e9e4da,#f7f4ee 45%,#d9d3c7)",
      clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0 100%)",
    },
    { left: "56.5%", top: "17%", width: "11%", height: "8%", background: "#b8483a", borderRadius: "3px 3px 0 0" },
    { inset: 0, background: "radial-gradient(ellipse at center, transparent 60%, rgb(30 40 50 / 0.2) 100%)" },
  ],
  "night-street": [
    { inset: 0, background: "linear-gradient(180deg,#1b2140 0%,#2b2e4e 55%,#3a3450 100%)" },
    {
      left: 0,
      top: "22%",
      width: "34%",
      bottom: "18%",
      background: "radial-gradient(circle, #f2c46e 0 1.6px, transparent 2.2px) 4px 6px / 14px 18px, #141a2e",
    },
    {
      right: 0,
      top: "34%",
      width: "30%",
      bottom: "18%",
      background: "radial-gradient(circle, #f2c46e 0 1.5px, transparent 2.1px) 2px 4px / 12px 20px, #11162a",
    },
    {
      left: "48%",
      top: "26%",
      width: "34%",
      height: "40%",
      background: "radial-gradient(ellipse at center, rgb(255 205 120 / 0.55), transparent 65%)",
    },
    { left: "64%", top: "36%", width: "1.2%", bottom: "18%", background: "#0d1020" },
    { left: 0, right: 0, bottom: 0, height: "18%", background: "linear-gradient(180deg,#191b2c,#0f1120)" },
    {
      left: "52%",
      bottom: 0,
      width: "26%",
      height: "18%",
      background: "radial-gradient(ellipse at top, rgb(255 200 120 / 0.35), transparent 70%)",
    },
  ],
  bookshelf: [
    { inset: 0, background: "linear-gradient(180deg,#6f4e36,#5a3e2a)" },
    {
      left: "6%",
      right: "6%",
      top: "8%",
      height: "24%",
      background:
        "repeating-linear-gradient(90deg,#d8ccb6 0 7%,#7b3c2f 7% 12%,#2f4a5a 12% 19%,#e3dccd 19% 22%,#8a6a3b 22% 30%,#3d3a36 30% 34%,transparent 34% 36%)",
    },
    {
      left: "6%",
      right: "6%",
      top: "41%",
      height: "24%",
      background:
        "repeating-linear-gradient(90deg,#44564a 0 6%,#c9b38f 6% 13%,#933f33 13% 17%,#e8e1d3 17% 24%,#2b3446 24% 29%,transparent 29% 33%)",
    },
    {
      left: "6%",
      right: "6%",
      top: "74%",
      height: "22%",
      background:
        "repeating-linear-gradient(90deg,#b98b4e 0 8%,#2e2b29 8% 12%,#d7d0c2 12% 18%,#6a4a6b 18% 22%,#a8473a 22% 28%,transparent 28% 31%)",
    },
    { left: 0, right: 0, top: "32%", height: "3%", background: "#3f2a1b" },
    { left: 0, right: 0, top: "65%", height: "3%", background: "#3f2a1b" },
    { inset: 0, background: "radial-gradient(ellipse at 40% 30%, rgb(255 230 190 / 0.18), transparent 60%)" },
  ],
};

export function SceneImage({ scene, className = "" }: { scene: Scene; className?: string }) {
  return (
    <div role="img" aria-label={sceneLabels[scene]} className={`relative overflow-hidden rounded-[10px] ${className}`}>
      {sceneLayers[scene].map((style, index) => (
        <div key={index} className="absolute" style={style} />
      ))}
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.12)]" />
    </div>
  );
}
