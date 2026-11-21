// 첫 화면의 예시와 처음부터 기록에 들어 있는 가상의 지난 프롬프트.
import { generatePrompt, refineWithText, type PurposeId, type TargetId } from "./generate";
import { finishedResult, makeId, type Session } from "./state";

export interface Example {
  id: string;
  icon: "notes" | "megaphone" | "image" | "inbox" | "bug";
  label: string;
  text: string;
  target: TargetId;
  purpose: PurposeId | null;
  // 예시를 고르면 함께 붙는 샘플 이미지(public 폴더 기준 주소)
  sample?: { url: string; name: string };
}

export const examples: Example[] = [
  {
    id: "minutes",
    icon: "notes",
    label: "회의록 요약 지시문",
    text: "주간 회의록을 요약해서 결정 사항과 할 일을 뽑아 주는 프롬프트",
    target: "chat",
    purpose: "work",
  },
  {
    id: "copy",
    icon: "megaphone",
    label: "상세페이지 첫 문구",
    text: "새로 나온 무선 이어폰의 상세페이지 첫 문구를 쓰는 프롬프트",
    target: "chat",
    purpose: "marketing",
  },
  {
    id: "mood",
    icon: "image",
    label: "이 사진 분위기로 그리기",
    text: "이 사진처럼 노을 진 바닷가에서 자전거 타는 사람",
    target: "image",
    purpose: null,
    sample: { url: "/samples/sunset.svg", name: "노을 바다.svg" },
  },
  {
    id: "triage",
    icon: "inbox",
    label: "고객 문의 분류",
    text: "들어온 고객 문의를 환불, 배송, 기술 지원, 기타로 분류하는 프롬프트",
    target: "chat",
    purpose: null,
  },
  {
    id: "bug",
    icon: "bug",
    label: "버그 수정 작업 지시",
    text: "목록 정렬이 새로고침하면 풀리는 버그를 고치는 작업 지시",
    target: "agent",
    purpose: "dev",
  },
];

const day = 24 * 60 * 60 * 1000;

function seedSession(input: { text: string; target: TargetId; purpose: PurposeId | null; daysAgo: number; extra?: string }, now: number): Session {
  const base = generatePrompt({ text: input.text, target: input.target, purpose: input.purpose, analyses: [] });
  const prompt = input.extra ? refineWithText(base, input.extra) : base;
  const turns: Session["turns"] = [
    { kind: "request", id: makeId("request"), text: input.text, images: [], target: input.target, purpose: input.purpose },
  ];
  if (input.extra) {
    turns.push(finishedResult(base));
    turns.push({ kind: "request", id: makeId("request"), text: input.extra, images: [], target: input.target, purpose: input.purpose });
  }
  turns.push(finishedResult(prompt));
  return {
    id: makeId("session"),
    title: input.text.length > 28 ? `${input.text.slice(0, 28)}…` : input.text,
    createdAt: now - input.daysAgo * day - 3 * 60 * 60 * 1000,
    target: input.target,
    purpose: input.purpose,
    baseText: input.text,
    baseImages: [],
    extras: input.extra ? [input.extra] : [],
    turns,
  };
}

export function seedSessions(now: number): Session[] {
  return [
    seedSession({ text: "동네 빵집의 가을 신메뉴 포스터", target: "image", purpose: "marketing", daysAgo: 1 }, now),
    seedSession({ text: "주간 매출 보고서 메일 초안을 쓰는 프롬프트", target: "chat", purpose: "work", daysAgo: 2, extra: "숫자는 표로 정리해 줘" }, now),
    seedSession({ text: "로그인 화면의 비밀번호 오류 문구를 고치는 작업 지시", target: "agent", purpose: "dev", daysAgo: 5 }, now),
  ];
}
