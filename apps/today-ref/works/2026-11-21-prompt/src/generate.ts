// 요청 문장, 용도, 대상, 이미지 분석을 받아 프롬프트 원문을 조립한다. 실제 모델 호출 없이 규칙으로 만든다.
import type { ImageAnalysis } from "./analyzeImage";

export const targets = [
  { id: "chat", label: "대화형 AI" },
  { id: "image", label: "이미지 생성" },
  { id: "agent", label: "코딩 에이전트" },
] as const;

export const purposes = [
  { id: "marketing", label: "마케팅", role: "브랜드 카피라이터" },
  { id: "design", label: "제품 디자인", role: "사용자 경험을 설계하는 제품 디자이너" },
  { id: "dev", label: "개발", role: "코드 리뷰에 익숙한 시니어 개발자" },
  { id: "education", label: "교육", role: "초보자를 가르치는 강사" },
  { id: "work", label: "업무 문서", role: "보고서를 다듬는 기획자" },
] as const;

export type TargetId = (typeof targets)[number]["id"];
export type PurposeId = (typeof purposes)[number]["id"];

export const refinements = [
  { id: "specific", label: "더 구체적으로" },
  { id: "shorter", label: "짧게 줄이기" },
  { id: "examples", label: "예시 넣기" },
  { id: "variables", label: "바꿀 부분을 변수로" },
] as const;

export type RefinementId = (typeof refinements)[number]["id"];

export interface GenerateInput {
  text: string;
  target: TargetId;
  purpose: PurposeId | null;
  analyses: ImageAnalysis[];
}

export function targetLabel(id: TargetId): string {
  return targets.find((target) => target.id === id)?.label ?? id;
}

export function purposeLabel(id: PurposeId): string {
  return purposes.find((purpose) => purpose.id === id)?.label ?? id;
}

interface TaskRule {
  match: RegExp;
  steps: string[];
  output: string[];
}

// 요청 문장에 들어 있는 낱말로 일의 종류를 고른다. 맞는 규칙이 없으면 마지막 일반 규칙을 쓴다.
const taskRules: TaskRule[] = [
  {
    match: /요약|정리|회의록/,
    steps: ["자료 전체를 읽고 결정된 사항과 미정 사항을 나눈다.", "결정마다 담당자와 기한을 찾는다.", "중복된 내용을 합치고 원문에 없는 내용은 더하지 않는다."],
    output: ["맨 위에 세 줄 요약", "## 결정 / ## 할 일(담당자, 기한) / ## 남은 질문 세 묶음", "자료에 없는 값은 '확인 필요'로 적기"],
  },
  {
    match: /분류|문의|티켓|라우팅/,
    steps: ["메시지의 긴급도, 영향 범위, 필요한 전문성을 판단한다.", "아래 선택지 중 하나만 고른다.", "고른 이유를 한 문장으로 적는다."],
    output: ["<분류>선택지 하나</분류>", "<이유>한 문장</이유>", "선택지 밖의 답은 쓰지 않기"],
  },
  {
    match: /광고|카피|문구|홍보|상세페이지/,
    steps: ["제품의 핵심 장점 하나를 고른다.", "읽는 사람이 바로 떠올릴 장면으로 바꿔 쓴다.", "길이가 다른 안을 세 개 만든다."],
    output: ["안마다 제목 한 줄과 설명 두 줄", "과장 표현과 근거 없는 수치는 쓰지 않기", "마지막에 가장 추천하는 안과 이유"],
  },
  {
    match: /메일|이메일|답장|안내문/,
    steps: ["받는 사람과 보내는 목적을 한 문장으로 정리한다.", "용건을 첫 문단에 쓴다.", "요청할 행동과 기한을 분명히 적는다."],
    output: ["제목 한 줄", "본문 세 문단 이내", "끝인사와 서명 자리 표시"],
  },
  {
    match: /블로그|글|에세이|기사|개요/,
    steps: ["읽는 사람이 이 글에서 얻을 것 하나를 정한다.", "그것을 중심으로 소제목 네다섯 개를 세운다.", "소제목마다 넣을 사례나 근거를 적는다."],
    output: ["제목 후보 세 개", "## 소제목과 각 두세 줄 설명", "도입 문단 초안"],
  },
  {
    match: /코드|리팩터|버그|테스트|API|컴포넌트|함수/,
    steps: ["관련 파일을 먼저 읽고 현재 동작을 확인한다.", "가장 작은 변경으로 요청을 만족시킨다.", "변경한 동작을 검사로 확인한다."],
    output: ["바꾼 파일과 이유", "실행한 검사와 결과", "확인하지 못한 것"],
  },
  {
    match: /.*/,
    steps: ["요청의 목적과 결과물을 받을 사람을 확인한다.", "필요한 정보가 빠졌으면 먼저 질문한다.", "결과를 만든 뒤 요청과 어긋나는 부분이 없는지 다시 본다."],
    output: ["핵심 결과를 맨 위에", "근거나 설명은 그 아래 짧게", "모르는 부분은 추측하지 않고 표시"],
  },
];

function pickRule(text: string): TaskRule {
  return taskRules.find((rule) => rule.match.test(text)) ?? taskRules[taskRules.length - 1];
}

function roleFor(purpose: PurposeId | null): string {
  return purposes.find((item) => item.id === purpose)?.role ?? "이 분야의 숙련된 전문가";
}

export function generatePrompt(input: GenerateInput): string {
  const goal = input.text.trim() || (input.analyses.length > 0 ? "첨부한 이미지와 같은 분위기의 결과를 만든다." : "");
  if (input.target === "image") return imagePrompt(goal, input.analyses);
  if (input.target === "agent") return agentPrompt(goal, input.purpose);
  return chatPrompt(goal, input.purpose, input.analyses);
}

function chatPrompt(goal: string, purpose: PurposeId | null, analyses: ImageAnalysis[]): string {
  const rule = pickRule(goal);
  const lines = [`너는 ${roleFor(purpose)}다.`, "", "## 목표", goal, "", "## 입력", "<자료>", "{{자료}}", "</자료>"];
  if (analyses.length > 0) {
    lines.push("", "## 참고 이미지", ...analyses.map((analysis, index) => `- 이미지 ${index + 1}: ${analysis.description}`));
  }
  lines.push(
    "",
    "## 작업 순서",
    ...rule.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## 출력 형식",
    ...rule.output.map((item) => `- ${item}`),
    "",
    "## 지켜야 할 것",
    "- 자료에 없는 사실을 지어내지 않는다.",
    "- 한국어로, 읽는 사람이 바로 쓸 수 있는 문장으로 쓴다.",
  );
  return lines.join("\n");
}

function imagePrompt(goal: string, analyses: ImageAnalysis[]): string {
  // 첫 이미지를 색과 구도의 기준으로 삼고, 나머지는 섞을 참고로 따로 적는다.
  const [main, ...others] = analyses;
  const lines = ["## 장면", goal];
  if (main) {
    lines.push(
      "",
      "## 색과 분위기",
      `- 주요 색: ${main.swatches.map((swatch) => `${swatch.name} ${swatch.hex}`).join(", ")}`,
      `- 톤: ${main.tags.join(", ")}`,
      "",
      "## 구도",
      `- ${main.orientation} 구도, 비율 ${main.ratio}`,
      `- ${main.contrast.replace("편", "")} 명암을 유지`,
    );
  } else {
    lines.push("", "## 색과 분위기", "- 주요 색: {{주요 색}}", "- 톤: {{분위기}}", "", "## 구도", "- {{구도}}, 비율 {{비율}}");
  }
  if (others.length > 0) {
    lines.push(
      "",
      "## 함께 섞을 이미지",
      ...others.map((analysis, index) => `- 이미지 ${index + 2}: ${analysis.swatches.slice(0, 2).map((swatch) => swatch.name).join("과 ")} 색, ${analysis.tags.slice(0, 2).join(", ")}`),
    );
  }
  lines.push(
    "",
    "## 피해야 할 것",
    "- 화면 속 글자와 워터마크",
    "- 손가락 수가 틀리거나 비틀린 몸",
    "",
    "## 한 줄 버전",
    oneLine(goal, main),
  );
  return lines.join("\n");
}

function oneLine(goal: string, analysis: ImageAnalysis | undefined): string {
  const scene = goal.replace(/[.。]\s*$/, "");
  if (!analysis) return `${scene}, {{분위기}}, 비율 {{비율}}`;
  const colors = analysis.swatches.slice(0, 2).map((swatch) => swatch.name).join("과 ");
  return `${scene}, ${colors} 색감, ${analysis.tags.slice(0, 3).join(", ")}, ${analysis.orientation} 구도, 비율 ${analysis.ratio}`;
}

function agentPrompt(goal: string, purpose: PurposeId | null): string {
  const rule = pickRule(goal);
  return [
    "## 목표",
    goal,
    "",
    "## 맥락",
    `- 작업자 관점: ${roleFor(purpose)}`,
    "- 저장소: {{저장소 경로}}",
    "- 먼저 읽을 파일: {{관련 파일}}",
    "",
    "## 진행 순서",
    ...rule.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## 완료 조건",
    "- 요청한 동작이 실제로 바뀌었고 기존 검사가 통과한다.",
    "- 바꾼 동작을 확인하는 검사를 실행했다.",
    "",
    "## 하지 말 것",
    "- 요청 밖의 파일 정리나 의존성 추가",
    "- 실패한 검사를 끄거나 건너뛰기",
    "",
    "## 보고 형식",
    ...rule.output.map((item) => `- ${item}`),
  ].join("\n");
}

// 다듬기 요청은 이전 프롬프트를 바탕으로 한 단계씩 바꾼다. 같은 요청을 두 번 눌러도 내용이 계속 쌓이지 않게 한다.
export function refinePrompt(prompt: string, refinement: RefinementId, target: TargetId): string {
  if (refinement === "shorter") return shorten(prompt);
  if (refinement === "examples") return addSection(prompt, "## 예시", exampleLines(target));
  if (refinement === "variables") return toVariables(prompt);
  return addSection(prompt, "## 더 지킬 것", specificLines(target));
}

export function refineWithText(prompt: string, request: string): string {
  const line = `- ${request.trim()}`;
  if (prompt.includes(line)) return prompt;
  const heading = "## 추가 요청";
  if (prompt.includes(heading)) return prompt.replace(heading, `${heading}\n${line}`);
  return `${prompt}\n\n${heading}\n${line}`;
}

function addSection(prompt: string, heading: string, body: string[]): string {
  if (prompt.includes(heading)) return prompt;
  return `${prompt}\n\n${heading}\n${body.join("\n")}`;
}

function shorten(prompt: string): string {
  const keep = new Set(["## 목표", "## 장면", "## 입력", "## 출력 형식", "## 한 줄 버전", "## 완료 조건", "## 추가 요청", "## 함께 섞을 이미지", "## 참고 이미지"]);
  const sections = prompt.split(/\n(?=## )/);
  const shortened = sections.filter((section) => {
    const heading = section.split("\n")[0];
    return !heading.startsWith("## ") || keep.has(heading);
  });
  return shortened
    .map((section) => {
      const [heading, ...rest] = section.split("\n");
      const items = rest.filter((line) => line.trim() !== "");
      return [heading, ...items.slice(0, 3)].join("\n");
    })
    .join("\n\n");
}

function toVariables(prompt: string): string {
  return prompt
    .replace(/^너는 (.+)다\.$/m, "너는 {{역할}}다.")
    .replace(/(## (?:목표|장면)\n)(?!\{\{)(.+)/, "$1{{요청}}")
    .replace(/비율 (\d+:\d+)/g, "비율 {{비율}}")
    .replace(/- 주요 색: (?!\{\{).+/, "- 주요 색: {{주요 색}}")
    // 한 줄 버전은 장면과 색을 다시 적으므로, 위에서 바꾼 변수와 같은 값을 쓰도록 통째로 바꾼다.
    .replace(/(## 한 줄 버전\n).+/, "$1{{요청}}, {{주요 색}} 색감, 비율 {{비율}}");
}

function exampleLines(target: TargetId): string[] {
  if (target === "image") return ["- 좋은 결과: 주제가 화면 가운데 3분의 1 안에 있고 배경이 단순하다.", "- 피할 결과: 주제가 잘리거나 색이 바랜 사진처럼 보인다."];
  if (target === "agent") return ["- 좋은 보고: 'src/list.ts의 정렬 기준을 날짜로 바꿨고 pnpm test 12개 통과'", "- 피할 보고: '고쳤습니다'처럼 확인 근거가 없는 문장"];
  return ["<예시 입력>", "{{예시 입력}}", "</예시 입력>", "<예시 출력>", "{{예시 출력}}", "</예시 출력>"];
}

function specificLines(target: TargetId): string[] {
  if (target === "image") return ["- 렌즈: 50mm, 눈높이 시점", "- 빛: 한쪽에서 들어오는 부드러운 빛", "- 질감: 표면의 결이 보이는 정도"];
  if (target === "agent") return ["- 변경은 한 번에 하나의 동작만", "- 새 함수에는 입력과 실패 조건을 적은 검사", "- 공개 인터페이스를 바꾸면 호출하는 곳을 모두 함께 수정"];
  return ["- 분량: 400자 안팎", "- 말투: 존댓말, 문장은 짧게", "- 판단이 어려우면 가능한 답 두 개와 각각의 조건을 쓴다."];
}

// {{이름}} 형태의 변수를 처음 나온 순서대로 한 번씩 돌려준다.
export function findVariables(prompt: string): string[] {
  const names = [...prompt.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]);
  return [...new Set(names)];
}

export function fillVariables(prompt: string, values: Record<string, string>): string {
  return prompt.replace(/\{\{([^{}]+)\}\}/g, (whole, name: string) => values[name]?.trim() || whole);
}

export function titleFrom(text: string, hasImage: boolean): string {
  const firstLine = text.trim().split("\n")[0] ?? "";
  if (firstLine) return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine;
  return hasImage ? "이미지로 만든 프롬프트" : "새 프롬프트";
}
