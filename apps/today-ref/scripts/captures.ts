// 레퍼런스 캡처 폴더의 위치. 검사(check.ts)와 갤러리(gallery/vite.config.ts)가 같은 위치를 읽도록 여기서만 정한다.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

// 캡처는 남의 화면이라 공개 저장소(for-me)에 넣지 않는다. 컴퓨터끼리 나누려고 비공개 저장소를 for-me와 같은 폴더
// (~/dev/p)에 받아 두고, 그 안에 <주제 id>/<파일>로 둔다(2026-11-27 사용자 결정).
export const capturesRepo = "today-ref-captures";

// root는 apps/today-ref 폴더다. TODAY_REF_CAPTURES가 있으면 그 경로를 쓴다.
// 비공개 저장소를 아직 받지 않은 사본은 예전처럼 today-ref 안의 captures/를 쓴다.
export function capturesDir(
  root: string,
  env: Record<string, string | undefined> = process.env,
  exists: (path: string) => boolean = existsSync,
): string {
  const configured = env.TODAY_REF_CAPTURES;
  if (configured) return resolve(configured);
  const shared = resolve(root, "..", "..", "..", capturesRepo);
  return exists(shared) ? shared : join(root, "captures");
}
