import type { LyricLine } from "../data";

// 재생 위치에 해당하는 줄. 첫 줄 전(전주)에는 -1이다.
export function currentLine(lyrics: LyricLine[], position: number): number {
  let found = -1;
  for (let index = 0; index < lyrics.length; index += 1) {
    if (lyrics[index].at <= position) found = index;
    else break;
  }
  return found;
}
