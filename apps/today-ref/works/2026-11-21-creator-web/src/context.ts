import { createContext, useContext, type Dispatch } from "react";

import type { Route } from "./router";
import type { AppAction, AppState } from "./store";

export type AppControls = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  now: number;
  go: (route: Route) => void;
  back: () => void;
  openJoin: (creatorId: string, tier: "member" | "close") => void;
  openCompose: (creatorId: string) => void;
  showToast: (message: string) => void;
};

export const AppContext = createContext<AppControls | null>(null);

export function useApp(): AppControls {
  const controls = useContext(AppContext);
  if (!controls) throw new Error("AppContext 밖에서 useApp을 불렀습니다");
  return controls;
}
