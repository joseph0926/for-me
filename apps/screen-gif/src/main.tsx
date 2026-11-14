import { isTauri } from "@tauri-apps/api/core";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Frame } from "./Frame";
import { Overlay } from "./Overlay";
import { Toolbar } from "./Toolbar";
import "./styles.css";

// 같은 화면 묶음을 세 창이 나눠 쓴다. Rust가 창을 만들 때 주소에 view를 붙인다.
const views = { overlay: Overlay, toolbar: Toolbar, frame: Frame };
type View = keyof typeof views;
const requested = new URLSearchParams(window.location.search).get("view");
const view: View = requested === "toolbar" || requested === "frame" ? requested : "overlay";

// 개발 서버 주소를 브라우저로 열면 Rust와 통신할 수 없어 화면이 동작하지 않는다.
document.body.dataset.view = isTauri() ? view : "toolbar";
const Screen = views[view];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">{isTauri() ? <Screen /> : <OutsideApp />}</MotionConfig>
  </StrictMode>,
);

function OutsideApp() {
  return <p className="p-6">screen-gif 앱에서 열어 주세요.</p>;
}
