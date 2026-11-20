// 대화 목록과 답변 생성 상태. 답변은 시작부터 흐른 시간(elapsedMs)만 저장하고,
// 보여 줄 단계와 글자 수는 그 시간에서 계산한다.
import { type AnswerPlan, type ModelId, type Tool, models, planAnswer } from "./answers";

export interface UserTurn {
  id: string;
  role: "user";
  text: string;
  tool: Tool | null;
}

export interface AssistantTurn {
  id: string;
  role: "assistant";
  question: string;
  tool: Tool | null;
  model: ModelId;
  variant: number;
  plan: AnswerPlan;
  elapsedMs: number;
  stopped: boolean;
}

export type Turn = UserTurn | AssistantTurn;

export interface Conversation {
  id: string;
  title: string;
  // 며칠 전에 마지막으로 이야기했는지. 지난 대화 목록을 묶는 데만 쓴다.
  daysAgo: number;
  turns: Turn[];
}

export interface ChatState {
  conversations: Conversation[];
  // null이면 아직 보내지 않은 새 대화 화면이다.
  currentId: string | null;
}

export type ChatAction =
  | { type: "send"; text: string; tool: Tool | null; model: ModelId }
  | { type: "tick"; dt: number }
  | { type: "stop" }
  | { type: "regenerate"; turnId: string; model: ModelId }
  | { type: "open"; id: string }
  | { type: "newChat" };

const START_DELAY_MS = 700;
const STEP_MS = 750;

export type Phase = "waiting" | "working" | "writing" | "done" | "stopped";

export interface Progress {
  phase: Phase;
  stepsShown: number;
  charsShown: number;
}

export function progressOf(turn: AssistantTurn): Progress {
  const { steps, text } = turn.plan;
  const writingStartsAt = START_DELAY_MS + steps.length * STEP_MS;
  const stepsShown = Math.min(steps.length, Math.max(0, Math.floor((turn.elapsedMs - START_DELAY_MS) / STEP_MS) + 1));
  const charsShown = Math.min(
    text.length,
    Math.max(0, Math.floor(((turn.elapsedMs - writingStartsAt) * models[turn.model].charsPerSecond) / 1000)),
  );
  const finished = charsShown >= text.length;
  const phase: Phase = turn.stopped
    ? "stopped"
    : finished
      ? "done"
      : charsShown > 0
        ? "writing"
        : steps.length > 0 && turn.elapsedMs >= START_DELAY_MS
          ? "working"
          : "waiting";
  return { phase, stepsShown: turn.elapsedMs >= START_DELAY_MS ? stepsShown : 0, charsShown };
}

export function isActive(turn: Turn): turn is AssistantTurn {
  if (turn.role !== "assistant") return false;
  const { phase } = progressOf(turn);
  return phase !== "done" && phase !== "stopped";
}

// 한 번에 하나의 답만 만든다. 다른 대화로 옮겨 가도 그 답은 계속 쓰인다.
export function activeTurn(state: ChatState): AssistantTurn | undefined {
  for (const conversation of state.conversations) {
    const found = conversation.turns.find(isActive);
    if (found) return found;
  }
  return undefined;
}

let nextId = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(nextId += 1)}`;

function assistantTurn(question: string, tool: Tool | null, model: ModelId, variant: number): AssistantTurn {
  return {
    id: newId("a"),
    role: "assistant",
    question,
    tool,
    model,
    variant,
    plan: planAnswer(question, tool, model, variant),
    elapsedMs: 0,
    stopped: false,
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send": {
      if (activeTurn(state)) return state;
      const user: UserTurn = { id: newId("u"), role: "user", text: action.text, tool: action.tool };
      const answer = assistantTurn(action.text, action.tool, action.model, 0);
      const current = state.conversations.find((conversation) => conversation.id === state.currentId);
      if (!current) {
        const conversation: Conversation = { id: newId("c"), title: titleFrom(action.text), daysAgo: 0, turns: [user, answer] };
        return { conversations: [conversation, ...state.conversations], currentId: conversation.id };
      }
      // 이어서 물은 대화는 목록 맨 위로 올린다.
      const updated = { ...current, daysAgo: 0, turns: [...current.turns, user, answer] };
      return {
        ...state,
        conversations: [updated, ...state.conversations.filter((conversation) => conversation.id !== current.id)],
      };
    }
    case "tick": {
      const active = activeTurn(state);
      if (!active) return state;
      return mapTurn(state, active.id, (turn) => ({ ...turn, elapsedMs: turn.elapsedMs + action.dt }));
    }
    case "stop": {
      const active = activeTurn(state);
      if (!active) return state;
      return mapTurn(state, active.id, (turn) => ({ ...turn, stopped: true }));
    }
    case "regenerate": {
      if (activeTurn(state)) return state;
      return mapTurn(state, action.turnId, (turn) => assistantTurn(turn.question, turn.tool, action.model, turn.variant + 1));
    }
    case "open":
      return { ...state, currentId: action.id };
    case "newChat":
      return { ...state, currentId: null };
  }
}

function mapTurn(state: ChatState, turnId: string, change: (turn: AssistantTurn) => AssistantTurn): ChatState {
  return {
    ...state,
    conversations: state.conversations.map((conversation) =>
      conversation.turns.some((turn) => turn.id === turnId)
        ? {
            ...conversation,
            turns: conversation.turns.map((turn) => (turn.id === turnId && turn.role === "assistant" ? change(turn) : turn)),
          }
        : conversation,
    ),
  };
}

function titleFrom(text: string): string {
  const firstLine = text.split("\n")[0].trim();
  return firstLine.length > 22 ? `${firstLine.slice(0, 22)}…` : firstLine;
}

// 지난 대화. 처음부터 다 쓴 답으로 둔다.
function finishedTurns(question: string, tool: Tool | null, model: ModelId): Turn[] {
  const answer = assistantTurn(question, tool, model, 0);
  return [
    { id: newId("u"), role: "user", text: question, tool },
    { ...answer, elapsedMs: 10 * 60 * 1000 },
  ];
}

export const initialChat: ChatState = {
  currentId: null,
  conversations: [
    { id: "c-rent", title: "전세와 월세 비교", daysAgo: 1, turns: finishedTurns("전세와 월세, 지금 뭐가 나을지 따져 줘", "web", "fast") },
    { id: "c-report", title: "보고서 첫 문단 다듬기", daysAgo: 3, turns: finishedTurns("보고서 첫 문단을 짧게 다듬는 방법 알려 줘", null, "fast") },
    { id: "c-routine", title: "아침 루틴 30분 짜기", daysAgo: 6, turns: finishedTurns("아침 루틴 30분짜리로 짜 줘", "think", "deep") },
  ],
};
