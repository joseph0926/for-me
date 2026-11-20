import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { MotionConfig } from "motion/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { viewSession, type ViewSession } from "./commands";
import { Frame } from "./Frame";
import { Overlay } from "./Overlay";
import { Toolbar } from "./Toolbar";
import "./styles.css";

// 같은 화면 묶음을 세 창이 나눠 쓴다. Rust가 창을 만들 때 주소에 view를 붙인다.
type View = "overlay" | "toolbar" | "frame";
const requested = new URLSearchParams(window.location.search).get("view");
const view: View = requested === "toolbar" || requested === "frame" ? requested : "overlay";

// 개발 서버 주소를 브라우저로 열면 Rust와 통신할 수 없어 화면이 동작하지 않는다.
document.body.dataset.view = isTauri() ? view : "toolbar";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);

function App() {
  if (!isTauri()) return <OutsideApp />;
  if (view === "frame") return <Frame />;
  return <SessionWindow view={view} />;
}

function SessionWindow({ view }: { view: "overlay" | "toolbar" }) {
  const [session, setSession] = useState<ViewSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let latest = 0;
    const refresh = async () => {
      const request = ++latest;
      try {
        const next = await viewSession();
        if (active && request === latest) {
          setSession(next);
          setError(null);
        }
      } catch (reason) {
        if (active && request === latest) setError(String(reason));
      }
    };
    // 첫 표시가 웹 화면 초기화보다 빠를 수 있어 구독한 뒤 현재 상태도 읽는다.
    const subscription = listen("session-changed", refresh);
    void subscription.then(refresh, (reason) => active && setError(String(reason)));
    return () => {
      active = false;
      void subscription.then((unlisten) => unlisten(), () => {});
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!session) return null;
  return view === "overlay"
    ? <Overlay key={session.id} id={session.id} />
    : <Toolbar key={session.id} id={session.id} error={session.error} initialElapsedMs={session.elapsedMs ?? 0} />;
}

function OutsideApp() {
  return <p className="p-6">screen-gif 앱에서 열어 주세요.</p>;
}
