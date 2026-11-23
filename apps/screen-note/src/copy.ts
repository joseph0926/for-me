import Konva from "konva";
import type { Region } from "./document";

export function copyImage(image: HTMLImageElement, marks: Konva.Group, view: Region) {
  // WebKit은 사용자 입력을 처리하는 동안 클립보드 쓰기를 시작해야 한다.
  const png = async () => {
    const output = new Konva.Group();
    try {
      output.add(new Konva.Image({ image }), marks.clone());
      const canvas = output.toCanvas({ ...view, pixelRatio: 1 });
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG 생성 실패")), "image/png");
      });
    } finally {
      output.destroy();
    }
  };
  return navigator.clipboard.write([new ClipboardItem({ "image/png": png() })]);
}
