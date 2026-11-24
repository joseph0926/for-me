import type Konva from "konva";
import type { Region } from "./document";
import { renderPng } from "./copy";

declare global {
  interface Window {
    __TAURI__?: { core: { invoke<T>(command: string, body: ArrayBuffer): Promise<T> } };
  }
}

function copyStem(name: string) {
  // 파일 이름의 접미사와 중복 번호를 붙일 공간을 남긴다. 한 글자는 UTF-8에서 최대 4바이트다.
  const stem = Array.from(name.replace(/\.[^.]+$/u, ""), char =>
    char.codePointAt(0)! < 32 || /[<>:"/\\|?*\u007f-\u009f]/u.test(char) ? "_" : char
  ).slice(0, 45).join("").trim().replace(/[. ]+$/u, "");
  return stem && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\./iu.test(stem) ? stem : "이미지";
}

export async function saveCopy(image: HTMLImageElement, marks: Konva.Group, view: Region, name: string) {
  const png = await renderPng(image, marks, view);
  const stem = copyStem(name);
  if (window.__TAURI__) {
    const body = await new Blob([stem, new Uint8Array([0]), png]).arrayBuffer();
    const filename = await window.__TAURI__.core.invoke<string>("save_copy", body);
    return `다운로드 폴더에 ${filename} 파일을 저장했습니다.`;
  }

  const url = URL.createObjectURL(png);
  const link = document.createElement("a");
  link.href = url;
  link.download = stem + "-복사본.png";
  try {
    link.click();
  } finally {
    // 브라우저가 다운로드에 URL을 넘긴 뒤 해제한다.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  return "PNG 다운로드를 요청했습니다.";
}
