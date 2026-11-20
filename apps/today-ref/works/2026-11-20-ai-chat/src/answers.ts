// 서버 없이 답변을 만든다. 추천 질문에는 미리 써 둔 답을, 그 밖의 질문에는 질문을 넣은 틀을 쓴다.
// 본문의 [구절](#n)은 n번 출처를 단 구절이다. 웹 검색을 쓰지 않은 답에서는 표시를 지우고 글만 남긴다.

export type Tool = "web" | "think";
export type ModelId = "fast" | "deep";

export interface Source {
  id: number;
  group: "web" | "file";
  publisher: string;
  title: string;
}

export interface AnswerPlan {
  steps: string[];
  text: string;
  sources: Source[];
  followUps: string[];
}

export const models: Record<ModelId, { name: string; description: string; charsPerSecond: number }> = {
  fast: { name: "곁 2 빠름", description: "짧은 질문에 바로 답합니다", charsPerSecond: 150 },
  deep: { name: "곁 2 깊이", description: "답을 한 번 더 검토하고 천천히 씁니다", charsPerSecond: 75 },
};

export const tools: Record<Tool, { label: string; placeholder: string; description: string }> = {
  web: { label: "웹 검색", placeholder: "웹에서 찾아볼 내용을 적어 주세요", description: "최신 자료를 찾아 출처와 함께 답합니다" },
  think: { label: "깊게 생각하기", placeholder: "차근차근 따져 볼 문제를 적어 주세요", description: "여러 답을 비교한 뒤 정리합니다" },
};

export const suggestions = [
  "전세와 월세, 지금 뭐가 나을지 따져 줘",
  "주말 1박 2일로 갈 만한 가까운 여행지 추천해 줘",
  "보고서 첫 문단을 짧게 다듬는 방법 알려 줘",
];

interface Canned {
  texts: string[];
  sources: Omit<Source, "id">[];
  followUps: string[];
}

const suggestionAnswers: Record<string, Canned> = {
  [suggestions[0]]: {
    texts: [
      `결론부터 말하면 **2년 이상 한곳에 살 계획이고 보증금을 지킬 장치를 갖출 수 있다면 전세, 이사 가능성이 크거나 목돈을 묶기 어렵다면 월세**가 유리합니다.

## 1. 매달 드는 돈으로 비교하기
- 전세는 보증금에 대한 이자(대출 이자 또는 예금으로 받을 수 있었던 이자)가 사실상 월 비용입니다.
- 월세는 월세에 관리비를 더한 금액이 그대로 나갑니다.
- [최근 전월세 전환율은 연 5%대 중반](#1)이라, 보증금 1억 원을 월세로 바꾸면 한 달 45만 원 안팎입니다.

## 2. 보증금 위험 따져 보기
- [전세가율이 80%를 넘는 집은 보증금을 돌려받지 못할 위험이 커진다](#2)는 분석이 많습니다.
- 계약 전 등기부등본의 근저당과 보증보험 가입 가능 여부를 꼭 확인하세요.

## 3. 이런 경우라면
1. 대출 금리가 전환율보다 낮다면 전세가 매달 덜 듭니다.
2. 1년 안에 이사할 수 있다면 중개 수수료와 대출 비용 때문에 월세가 편합니다.
3. [월세 세액공제](#3)를 받을 수 있다면 실제 부담이 조금 줄어듭니다.

---
보증금 규모와 대출 금리를 알려 주시면 두 경우의 한 달 비용을 숫자로 계산해 드릴게요.`,
      `한 줄로 정리하면 **매달 나가는 실제 비용과 보증금을 잃을 위험, 두 가지를 같이 봐야** 합니다.

## 한 달 비용
- 전세: 보증금 대출 이자 또는 놓친 예금 이자
- 월세: 월세와 관리비
- [전월세 전환율 연 5%대 중반](#1)을 기준으로 바꿔 보면 비교가 쉬워집니다.

## 위험
- [전세가율이 높은 집](#2)은 계약을 서두르지 않는 편이 좋습니다.
- 월세는 보증금이 작아 이 위험이 훨씬 작습니다.

## 덤으로
- 조건이 맞으면 [월세 세액공제](#3)로 일부를 돌려받을 수 있습니다.

---
살 기간과 가진 현금을 알려 주시면 어느 쪽이 나은지 다시 따져 볼게요.`,
    ],
    sources: [
      { group: "web", publisher: "생활경제연구소", title: "전월세 전환율, 수도권 연 5.6%로 소폭 상승" },
      { group: "web", publisher: "한빛일보", title: "전세가율 80% 넘는 단지, 보증금 반환 사고 비중 높아" },
      { group: "web", publisher: "세금길잡이", title: "월세 세액공제 대상과 신청 방법 정리" },
      { group: "web", publisher: "주거정책 리포트", title: "임차인이 계약 전에 확인할 서류 다섯 가지" },
    ],
    followUps: ["보증금 2억일 때 한 달 비용 계산해 줘", "전세 계약 전 확인할 서류 알려 줘", "월세 세액공제 조건 알려 줘"],
  },
  [suggestions[1]]: {
    texts: [
      `차로 2시간 안쪽에서 **바다, 산, 도시 산책 중 무엇을 원하는지**에 따라 고르면 실패가 적습니다.

## 바다를 보고 싶다면
- **강릉**: [KTX로 2시간이 안 걸리고](#1) 안목해변 커피 거리와 경포호 산책을 하루에 묶기 좋습니다.
- **태안**: 해 질 녘 꽃지해변이 유명하고 숙소 선택지가 많습니다.

## 걷고 쉬고 싶다면
- **가평과 춘천**: [11월에도 단풍 끝물과 호수 산책을 함께 즐길 수 있습니다](#2).
- **담양**: 대나무숲과 메타세쿼이아 길이 평지라 부담이 적습니다.

## 1박 2일 짜는 요령
1. 첫날은 이동과 저녁 한 곳만 정하고 일찍 쉬세요.
2. 둘째 날 오전에 가장 보고 싶은 곳을 두면 붐비기 전에 볼 수 있습니다.
3. [주말 숙소는 목요일 전에 예약](#3)하는 편이 값이 낮습니다.

---
출발 도시와 이동 수단을 알려 주시면 동선까지 짜 드릴게요.`,
    ],
    sources: [
      { group: "web", publisher: "여행매거진 길", title: "KTX로 떠나는 당일치기와 1박 바다 여행지" },
      { group: "web", publisher: "한빛일보", title: "11월 둘째 주까지 즐기는 수도권 근교 단풍" },
      { group: "web", publisher: "생활경제연구소", title: "주말 숙박 요금, 예약 시점에 따라 최대 30% 차이" },
    ],
    followUps: ["강릉 1박 2일 동선 짜 줘", "아이와 가기 좋은 곳만 골라 줘", "비 오는 날 갈 만한 곳은?"],
  },
  [suggestions[2]]: {
    texts: [
      `첫 문단은 **읽는 사람이 이 보고서를 끝까지 읽어야 할 이유**만 남기면 짧아집니다.

## 세 단계로 줄이기
1. 결론을 한 문장으로 먼저 씁니다. 예: "3분기 문의 응답 시간이 40% 줄었습니다."
2. 그 결론을 믿을 근거를 하나만 붙입니다. 숫자나 비교가 가장 좋습니다.
3. 읽는 사람이 할 일이나 결정을 마지막 문장에 둡니다.

## 지우면 좋은 표현
- "본 보고서에서는 ~에 대해 살펴보고자 합니다" 같은 예고 문장
- 같은 뜻을 두 번 말하는 수식어(매우, 상당히, 다양한)
- 배경 설명. 꼭 필요하면 둘째 문단으로 옮기세요.

---
지금 쓰신 첫 문단을 붙여 주시면 이 기준으로 직접 고쳐 드릴게요.`,
    ],
    sources: [
      { group: "web", publisher: "글쓰기 연구소", title: "보고서 첫 문단, 결론부터 쓰는 이유" },
      { group: "web", publisher: "업무 노트", title: "회의 자료에서 지워야 할 표현 열 가지" },
    ],
    followUps: ["내 문단을 직접 고쳐 줘", "결론 문장 예시 더 보여 줘", "이메일 첫 문장에도 적용해 줘"],
  },
};

// 위 답들이 제안하는 첫 번째 이어서 물을 질문과 지난 대화의 질문. 누르면 질문에 맞는 답이 나오게 써 둔다.
const followUpAnswers: Record<string, Canned> = {
  "보증금 2억일 때 한 달 비용 계산해 줘": {
    texts: [
      `보증금 2억 원을 기준으로 두 경우를 나란히 놓아 볼게요. **대출 금리 4%라면 전세가 한 달 약 25만 원 덜 듭니다.**

## 전세로 들어갈 때
- 2억 원을 모두 대출받으면 이자는 연 800만 원, 한 달 약 **67만 원**입니다.
- 자기 돈이라면 [예금 금리 3%](#1)로 받았을 이자 한 달 50만 원을 포기하는 셈입니다.

## 월세로 바꿀 때
- [전월세 전환율 연 5.6%](#2)를 적용하면 2억 원은 한 달 약 **93만 원**입니다.
- 관리비는 두 경우가 같다고 보고 뺐습니다.

## 정리
1. 대출 금리가 5.6%보다 낮으면 전세가 매달 덜 듭니다.
2. 다만 전세는 보증금 반환 위험이 있으니 보증보험 비용(연 0.1~0.2%대)도 더해 보세요.

---
실제 대출 금리를 알려 주시면 숫자를 바꿔 다시 계산해 드릴게요.`,
    ],
    sources: [
      { group: "web", publisher: "생활경제연구소", title: "시중은행 1년 정기예금 금리 3%대 초반 유지" },
      { group: "web", publisher: "생활경제연구소", title: "전월세 전환율, 수도권 연 5.6%로 소폭 상승" },
    ],
    followUps: ["보증보험 비용도 넣어서 계산해 줘", "대출 금리 5%면 어떻게 돼?", "표로 정리해 줘"],
  },
  "강릉 1박 2일 동선 짜 줘": {
    texts: [
      `서울에서 KTX로 출발한다고 보고 **이동은 줄이고 바다를 오래 보는 동선**으로 짰습니다.

## 첫날
1. 오전 9시대 KTX로 강릉역 도착
2. 점심: 역 근처 중앙시장에서 장칼국수
3. 오후: [안목해변 커피 거리](#1)에서 쉬다가 해변 산책
4. 저녁: 경포 쪽 숙소에 짐을 풀고 경포호 한 바퀴

## 둘째 날
1. 아침: 해 뜨는 시간에 맞춰 경포해변
2. 오전: 오죽헌이나 선교장 중 한 곳만
3. 점심 뒤 오후 3시대 KTX로 돌아가기

---
차로 가신다면 정동진을 둘째 날 아침에 넣는 동선으로 바꿔 드릴게요.`,
    ],
    sources: [{ group: "web", publisher: "여행매거진 길", title: "KTX로 떠나는 당일치기와 1박 바다 여행지" }],
    followUps: ["차로 가는 동선으로 바꿔 줘", "숙소는 어디가 좋아?", "비 오면 어디 가?"],
  },
  "내 문단을 직접 고쳐 줘": {
    texts: [
      `좋아요. 고칠 문단을 **이 대화에 그대로 붙여** 주세요. 받으면 이렇게 고쳐 드릴게요.

1. 결론 문장을 맨 앞으로 옮기고 한 문장으로 줄입니다.
2. 근거는 숫자가 있는 문장 하나만 남깁니다.
3. 예고 문장과 겹치는 수식어를 지웁니다.

고친 문단과 함께 무엇을 왜 지웠는지 짧게 표시해 드릴게요.`,
    ],
    sources: [],
    followUps: ["예시 문단으로 먼저 보여 줘", "이메일 첫 문장에도 적용해 줘", "결론 문장 예시 더 보여 줘"],
  },
  "아침 루틴 30분짜리로 짜 줘": {
    texts: [
      `30분 안에 **몸 깨우기, 머리 정리, 하루 계획**을 10분씩 나눴습니다.

## 0~10분: 몸 깨우기
- 일어나자마자 물 한 컵
- 목, 어깨, 허리 순서로 스트레칭 5분
- 창문을 열고 햇빛을 2~3분 쬐기

## 10~20분: 머리 정리
- 휴대폰 알림은 아직 보지 않습니다.
- 어제 못 끝낸 일과 오늘 마음에 걸리는 일을 종이에 적기

## 20~30분: 하루 계획
1. 오늘 꼭 끝낼 일 하나를 고릅니다.
2. 그 일을 할 시간을 달력에 먼저 막아 둡니다.
3. 나머지는 목록에만 남깁니다.

---
일어나는 시간과 출근 시간을 알려 주시면 순서를 맞춰 드릴게요.`,
    ],
    sources: [],
    followUps: ["15분짜리로 줄여 줘", "주말 루틴도 짜 줘", "운동을 더 넣어 줘"],
  },
};

const canned: Record<string, Canned> = { ...suggestionAnswers, ...followUpAnswers };

const thinkSteps =["질문을 작은 문제로 나누기", "가능한 답 세 가지 비교하기", "빠진 조건이 없는지 다시 보기"];

export function planAnswer(question: string, tool: Tool | null, model: ModelId, variant: number): AnswerPlan {
  const entry = canned[question];
  const keyword = question.length > 14 ? `${question.slice(0, 14)}…` : question;
  const steps =
    tool === "web"
      ? ["질문에서 찾을 말 고르기", `웹에서 '${keyword}' 찾기`, `자료 ${entry ? entry.sources.length + 3 : 5}건 읽기`, "겹치는 내용 정리하기"]
      : tool === "think"
        ? [...thinkSteps]
        : [];
  if (model === "deep" && steps.length > 0) steps.push("쓴 답을 한 번 더 검토하기");

  const rawText = entry ? entry.texts[variant % entry.texts.length] : genericText(question, variant);
  const rawSources = entry ? entry.sources : genericSources(question);
  const useSources = tool === "web";
  return {
    steps,
    text: useSources ? rawText : stripCitations(rawText),
    sources: useSources ? rawSources.map((source, index) => ({ ...source, id: index + 1 })) : [],
    followUps: entry ? entry.followUps : genericFollowUps(question),
  };
}

function genericText(question: string, variant: number): string {
  const openings = [
    `"${question}"에 대해 차근차근 정리해 볼게요.`,
    `좋은 질문이에요. "${question}"를 세 부분으로 나눠 볼게요.`,
  ];
  return `${openings[variant % openings.length]}

**가장 먼저 할 일은 목표와 조건을 한 줄로 적어 두는 것**입니다. 무엇을 얻고 싶은지가 정해지면 나머지 선택이 쉬워집니다.

## 1. 지금 상황 확인하기
- 이미 정해진 것과 아직 정하지 못한 것을 나눠 적어 보세요.
- [비슷한 고민을 한 사람들의 사례](#1)를 두세 개만 찾아보면 기준이 생깁니다.

## 2. 선택지 좁히기
1. 꼭 지켜야 하는 조건 하나를 고릅니다.
2. 그 조건을 만족하지 않는 선택지는 지웁니다.
3. 남은 것 중 [바꾸기 쉬운 쪽](#2)을 먼저 해 봅니다.

## 3. 해 보고 고치기
- 일주일 정도 해 본 뒤 무엇이 불편했는지만 적어 두세요.
- 처음부터 완벽하게 정하려고 하지 않아도 됩니다.

---
조건을 조금 더 알려 주시면 그에 맞춰 다시 정리해 드릴게요.`;
}

function genericSources(question: string): Omit<Source, "id">[] {
  const topic = question.length > 16 ? `${question.slice(0, 16)}…` : question;
  return [
    { group: "web", publisher: "생활 질문 모음", title: `${topic} 경험담 정리` },
    { group: "web", publisher: "한빛일보", title: "결정을 미루지 않는 작은 실험의 힘" },
    { group: "web", publisher: "업무 노트", title: "선택지를 줄이는 세 가지 질문" },
  ];
}

function genericFollowUps(question: string): string[] {
  const short = question.length > 12 ? `${question.slice(0, 12)}…` : question;
  return [`${short} 더 자세히 알려 줘`, "표로 정리해 줘", "한 문단으로 줄여 줘"];
}

function stripCitations(text: string): string {
  return text.replace(/\[([^\]]+)\]\(#\d+\)/g, "$1");
}
