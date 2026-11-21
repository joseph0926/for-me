// 탭마다 자기 화면 스택을 가진다. 탭의 첫 화면 위로 쌓이는 화면은 Screen 하나로 표현한다.
export type TabId = "home" | "explore" | "alerts" | "me";

export const TAB_IDS: TabId[] = ["home", "explore", "alerts", "me"];

export type CreatorSection = "notice" | "schedule" | "from" | "fans";

export type Screen =
  | { name: "creator"; creatorId: string; section: CreatorSection }
  | { name: "post"; postId: string; focusComment: boolean };

export type NavState = {
  tab: TabId;
  stacks: Record<TabId, Screen[]>;
};

export type NavAction =
  | { type: "selectTab"; tab: TabId }
  | { type: "push"; screen: Screen }
  | { type: "pop" };

export const initialNav: NavState = {
  tab: "home",
  stacks: { home: [], explore: [], alerts: [], me: [] },
};

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "selectTab":
      // 이미 보고 있는 탭을 다시 누르면 첫 화면으로 돌아간다.
      if (action.tab === state.tab) {
        return { ...state, stacks: { ...state.stacks, [action.tab]: [] } };
      }
      return { ...state, tab: action.tab };
    case "push":
      return {
        ...state,
        stacks: { ...state.stacks, [state.tab]: [...state.stacks[state.tab], action.screen] },
      };
    case "pop":
      return {
        ...state,
        stacks: { ...state.stacks, [state.tab]: state.stacks[state.tab].slice(0, -1) },
      };
  }
}

export function screenKey(screen: Screen, depth: number): string {
  const target = screen.name === "post" ? screen.postId : screen.creatorId;
  return `${depth}-${screen.name}-${target}`;
}
