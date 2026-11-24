// 화면 어디서나 쓰는 상태와 동작. 글쓰기 창, 사진 크게 보기, 알림은 App 한 곳이 띄운다.
import { createContext, useContext, type Dispatch } from "react";

import type { Photo } from "./data";
import type { Action, State } from "./store";

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface AppApi {
  state: State;
  dispatch: Dispatch<Action>;
  // 상대 시각을 계산할 기준. 1분마다 바뀐다.
  now: number;
  openComposer: (replyToId?: string) => void;
  openViewer: (photos: Photo[], index: number) => void;
  toast: (message: string, action?: ToastAction) => void;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp() {
  const api = useContext(AppContext);
  if (!api) throw new Error("AppContext 밖에서 useApp을 불렀습니다");
  return api;
}
