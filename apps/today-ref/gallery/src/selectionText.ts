import type { Reference, Topic } from "../../topic.ts";
import { referenceNumber } from "./topics.ts";

export interface Pick {
  ref: string;
  part: string;
}

// 사용자가 대화창에 붙여 넣는 선택 문장. AI는 docs/agent.md의 절차로 이 문장을 topic.json의 selection으로 옮긴다.
export function selectionText(topic: Topic, picks: Pick[]): string {
  const byId = new Map(topic.references.map((reference) => [reference.id, reference]));
  const label = (reference: Reference) => `${referenceNumber(reference)}번 ${reference.product} ${reference.title}`;
  const lines = [`오늘의 레퍼런스 ${topic.id} 선택`];

  if (picks.length === 1) {
    const [pick] = picks;
    const reference = byId.get(pick.ref);
    if (reference) lines.push(`하나로 결정: ${label(reference)}`);
    if (pick.part.trim() !== "") lines.push(`메모: ${pick.part.trim()}`);
  } else {
    lines.push("조합:");
    for (const pick of picks) {
      const reference = byId.get(pick.ref);
      if (!reference) continue;
      const part = pick.part.trim() === "" ? "가져올 부분 제안 요청" : pick.part.trim();
      lines.push(`- ${label(reference)}: ${part}`);
    }
  }
  return lines.join("\n");
}
