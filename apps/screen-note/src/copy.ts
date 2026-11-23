import Konva from "konva";
import type { Region } from "./document";

export type CopyResult = "copied" | "render-failed" | "clipboard-failed";

async function renderPng(image: HTMLImageElement, marks: Konva.Group, view: Region) {
  const output = new Konva.Group();
  let canvas: HTMLCanvasElement | undefined;
  try {
    output.add(new Konva.Image({ image }), marks.clone());
    const rendered = output.toCanvas({ ...view, pixelRatio: 1 });
    canvas = rendered;
    return await new Promise<Blob>((resolve, reject) => {
      rendered.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG 생성 실패")), "image/png");
    });
  } finally {
    output.destroy();
    // 원본 해상도 캔버스의 픽셀 저장소가 가비지 수집 때까지 남지 않게 바로 비운다.
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export async function copyImage(image: HTMLImageElement, marks: Konva.Group, view: Region): Promise<CopyResult> {
  let rendered = true;
  // WebKit은 사용자 입력을 처리하는 동안 클립보드 쓰기를 시작해야 하므로 PNG를 기다리지 않고 넘긴다.
  const png = renderPng(image, marks, view);
  // 클립보드가 PNG를 받기 전에 거절해도 생성 실패가 처리되지 않은 오류로 남지 않게 여기서 받는다.
  png.catch(() => {
    rendered = false;
  });
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return "copied";
  } catch {
    return rendered ? "clipboard-failed" : "render-failed";
  }
}
