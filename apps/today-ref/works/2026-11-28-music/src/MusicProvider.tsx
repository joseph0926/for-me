import { createContext, use, useEffect, useReducer, type Dispatch, type ReactNode } from "react";

import { initialMusic, musicReducer, type MusicAction, type MusicState } from "./music";

const MusicContext = createContext<{ state: MusicState; dispatch: Dispatch<MusicAction> } | null>(null);

// 실제 소리는 내지 않고 재생 시간만 흐르게 한다. 재생 중일 때만 시계를 돌린다.
const tickMs = 250;

export function MusicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(musicReducer, initialMusic);

  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setInterval(() => dispatch({ type: "tick", seconds: tickMs / 1000 }), tickMs);
    return () => window.clearInterval(timer);
  }, [state.playing]);

  return <MusicContext value={{ state, dispatch }}>{children}</MusicContext>;
}

export function useMusic() {
  const value = use(MusicContext);
  if (!value) throw new Error("MusicProvider 안에서만 씁니다");
  return value;
}
