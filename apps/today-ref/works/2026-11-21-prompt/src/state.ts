// 대화 기록과 생성 진행 상태. 한 번에 하나의 결과만 쓰이고, 기록 화면과 만들기 화면이 같은 세션 목록을 읽는다.
import type { ImageAnalysis } from "./analyzeImage";
import {
  generatePrompt,
  refinePrompt,
  refineWithText,
  titleFrom,
  type PurposeId,
  type RefinementId,
  type TargetId,
} from "./generate";

export interface SentImage {
  id: string;
  name: string;
  url: string;
  analysis: ImageAnalysis;
}

export interface RequestTurn {
  kind: "request";
  id: string;
  text: string;
  images: SentImage[];
  target: TargetId;
  purpose: PurposeId | null;
}

export type ResultStatus = "thinking" | "writing" | "done" | "stopped";

export interface ResultTurn {
  kind: "result";
  id: string;
  images: SentImage[];
  prompt: string;
  status: ResultStatus;
  // thinking 동안 남은 틱 수와 writing 동안 보여 준 글자 수
  waitTicks: number;
  revealed: number;
  values: Record<string, string>;
}

export type Turn = RequestTurn | ResultTurn;

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  target: TargetId;
  purpose: PurposeId | null;
  // 대상이나 용도를 바꿔 다시 만들 때 쓰는 처음 요청과 그 뒤에 덧붙인 요청
  baseText: string;
  baseImages: SentImage[];
  extras: string[];
  turns: Turn[];
}

export type View = "make" | "history";

export interface State {
  sessions: Session[];
  activeId: string | null;
  view: View;
}

export interface Submission {
  text: string;
  images: SentImage[];
  target: TargetId;
  purpose: PurposeId | null;
}

export type Action =
  | { type: "submit"; submission: Submission; now: number }
  | { type: "refine"; refinement: RefinementId; label: string }
  | { type: "tick" }
  | { type: "stop" }
  | { type: "setValue"; resultId: string; name: string; value: string }
  | { type: "open"; sessionId: string }
  | { type: "newSession" }
  | { type: "setView"; view: View };

const THINKING_TICKS = 18;

let counter = 0;
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function activeSession(state: State): Session | null {
  return state.sessions.find((session) => session.id === state.activeId) ?? null;
}

export function latestResult(session: Session | null): ResultTurn | null {
  if (!session) return null;
  for (let index = session.turns.length - 1; index >= 0; index -= 1) {
    const turn = session.turns[index];
    if (turn.kind === "result") return turn;
  }
  return null;
}

export function isBusy(state: State): boolean {
  const result = latestResult(activeSession(state));
  return result !== null && (result.status === "thinking" || result.status === "writing");
}

function newResult(prompt: string, images: SentImage[]): ResultTurn {
  return { kind: "result", id: makeId("result"), images, prompt, status: "thinking", waitTicks: THINKING_TICKS, revealed: 0, values: {} };
}

function updateSession(state: State, sessionId: string, change: (session: Session) => Session): State {
  return { ...state, sessions: state.sessions.map((session) => (session.id === sessionId ? change(session) : session)) };
}

function updateLatestResult(session: Session, change: (result: ResultTurn) => ResultTurn): Session {
  const result = latestResult(session);
  if (!result) return session;
  return { ...session, turns: session.turns.map((turn) => (turn.id === result.id ? change(result) : turn)) };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "submit": {
      if (isBusy(state)) return state;
      const { submission } = action;
      const request: RequestTurn = { kind: "request", id: makeId("request"), ...submission };
      const session = activeSession(state);
      const previous = latestResult(session);

      if (!session || !previous) {
        const prompt = generatePrompt({ text: submission.text, target: submission.target, purpose: submission.purpose, analyses: submission.images.map((image) => image.analysis) });
        const created: Session = {
          id: makeId("session"),
          title: titleFrom(submission.text, submission.images.length > 0),
          createdAt: action.now,
          target: submission.target,
          purpose: submission.purpose,
          baseText: submission.text,
          baseImages: submission.images,
          extras: [],
          turns: [request, newResult(prompt, submission.images)],
        };
        const others = state.sessions.filter((item) => item.id !== session?.id);
        return { ...state, sessions: [created, ...others], activeId: created.id, view: "make" };
      }

      // 이어서 보낸 요청: 대상이나 용도가 바뀌었거나 새 이미지가 있으면 처음 요청부터 다시 만들고, 아니면 이전 결과에 요청을 덧붙인다.
      const extras = submission.text.trim() ? [...session.extras, submission.text.trim()] : session.extras;
      const baseImages = [...session.baseImages, ...submission.images];
      const changed = submission.target !== session.target || submission.purpose !== session.purpose || submission.images.length > 0;
      const prompt = changed
        ? extras.reduce(
            (text, extra) => refineWithText(text, extra),
            generatePrompt({ text: session.baseText, target: submission.target, purpose: submission.purpose, analyses: baseImages.map((image) => image.analysis) }),
          )
        : submission.text.trim()
          ? refineWithText(previous.prompt, submission.text)
          : previous.prompt;

      return updateSession(state, session.id, (current) => ({
        ...current,
        target: submission.target,
        purpose: submission.purpose,
        baseImages,
        extras,
        turns: [...current.turns, request, newResult(prompt, submission.images)],
      }));
    }
    case "refine": {
      if (isBusy(state)) return state;
      const session = activeSession(state);
      const previous = latestResult(session);
      if (!session || !previous) return state;
      const request: RequestTurn = { kind: "request", id: makeId("request"), text: action.label, images: [], target: session.target, purpose: session.purpose };
      const prompt = refinePrompt(previous.prompt, action.refinement, session.target);
      return updateSession(state, session.id, (current) => ({ ...current, turns: [...current.turns, request, newResult(prompt, [])] }));
    }
    case "tick": {
      const session = activeSession(state);
      if (!session || !isBusy(state)) return state;
      return updateSession(state, session.id, (current) =>
        updateLatestResult(current, (result) => {
          if (result.status === "thinking") {
            return result.waitTicks > 1 ? { ...result, waitTicks: result.waitTicks - 1 } : { ...result, status: "writing", waitTicks: 0 };
          }
          const step = Math.max(5, Math.ceil(result.prompt.length / 110));
          const revealed = Math.min(result.prompt.length, result.revealed + step);
          return { ...result, revealed, status: revealed >= result.prompt.length ? "done" : "writing" };
        }),
      );
    }
    case "stop": {
      const session = activeSession(state);
      if (!session || !isBusy(state)) return state;
      // 멈춘 결과는 보여 준 부분까지만 남겨, 다듬기와 복사가 화면과 같은 글을 쓰게 한다.
      return updateSession(state, session.id, (current) =>
        updateLatestResult(current, (result) => ({ ...result, status: "stopped", prompt: result.prompt.slice(0, result.revealed) })),
      );
    }
    case "setValue": {
      const session = activeSession(state);
      if (!session) return state;
      return updateSession(state, session.id, (current) => ({
        ...current,
        turns: current.turns.map((turn) =>
          turn.kind === "result" && turn.id === action.resultId ? { ...turn, values: { ...turn.values, [action.name]: action.value } } : turn,
        ),
      }));
    }
    case "open":
      if (isBusy(state)) return { ...state, view: "make" };
      return { ...state, activeId: action.sessionId, view: "make" };
    case "newSession":
      if (isBusy(state)) return state;
      return { ...state, activeId: null, view: "make" };
    case "setView":
      return { ...state, view: action.view };
  }
}

export function finishedResult(prompt: string, images: SentImage[] = []): ResultTurn {
  return { kind: "result", id: makeId("result"), images, prompt, status: "done", waitTicks: 0, revealed: prompt.length, values: {} };
}
