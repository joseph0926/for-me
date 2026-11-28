import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { PhoneFrame } from "./PhoneFrame";
import { platform } from "./platform";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root가 없습니다");

createRoot(root).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      {platform === "app" ? (
        <PhoneFrame>
          <App />
        </PhoneFrame>
      ) : (
        <App />
      )}
    </MotionConfig>
  </StrictMode>,
);
