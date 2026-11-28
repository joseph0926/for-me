// 화면 사이를 오가는 동작(목록 열기, 곡 더보기, 알림)을 깊은 화면에 건네는 통로.
import { createContext, use } from "react";

export type Route =
  | { kind: "playlist"; id: string }
  | { kind: "album"; id: string }
  | { kind: "liked" }
  | { kind: "recent" }
  | { kind: "top" }
  | { kind: "albums" };

export interface Ui {
  open: (route: Route) => void;
  back: () => void;
  openActions: (trackId: string) => void;
  notify: (message: string) => void;
}

export const UiContext = createContext<Ui | null>(null);

export function useUi(): Ui {
  const value = use(UiContext);
  if (!value) throw new Error("UiContext 안에서만 씁니다");
  return value;
}
