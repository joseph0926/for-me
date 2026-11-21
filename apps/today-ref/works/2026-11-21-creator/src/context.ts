import { createContext, useContext, type Dispatch } from "react";

import type { Screen, TabId } from "./navigation";
import type { AppAction, AppState } from "./store";

export type AppControls = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  now: number;
  open: (screen: Screen) => void;
  back: () => void;
  selectTab: (tab: TabId) => void;
  openMembership: (creatorId: string) => void;
  openCompose: (creatorId: string) => void;
  openLive: (creatorId: string) => void;
  showToast: (message: string) => void;
};

export const AppContext = createContext<AppControls | null>(null);

export function useApp(): AppControls {
  const controls = useContext(AppContext);
  if (!controls) throw new Error("AppContext 밖에서 useApp을 불렀습니다");
  return controls;
}
