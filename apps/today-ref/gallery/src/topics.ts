import { collectTopics, parseTopicFile, workPackageName, type Reference, type Topic, type TopicEntry } from "../../topic.ts";

// JSON으로 바로 불러오면 한 파일의 문법 오류가 갤러리 전체를 멈춘다. 글자로 읽어 주제마다 따로 판정한다.
const files = import.meta.glob<string>("../../topics/*/topic.json", { query: "?raw", import: "default", eager: true });

export const topicEntries: TopicEntry[] = collectTopics(
  Object.entries(files).map(([path, raw]) => parseTopicFile(path.split("/").at(-2) ?? path, raw)),
);

export function captureUrl(topic: Topic, name: string): string {
  return `/${topic.id}/${name}`;
}

// r3 같은 id에서 화면과 선택 문장에 쓰는 번호를 얻는다. 주제 파일을 고쳐도 번호가 밀리지 않는다.
export function referenceNumber(reference: Reference): number {
  return Number(reference.id.slice(1));
}

export function runCommand(topic: Topic): string {
  return `pnpm --filter ${workPackageName(topic.id)} dev`;
}

export const statusLabels: Record<Topic["status"], string> = {
  selecting: "선택 대기",
  building: "제작 중",
  done: "완성",
};

export const platformLabels: Record<Topic["platform"], string> = {
  web: "웹",
  app: "앱",
};

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
