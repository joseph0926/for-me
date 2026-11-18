import type { ReactNode } from "react";

import "./PhoneFrame.css";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-stage">
      <div className="phone-shell">
        <div className="phone-screen">
          <div className="phone-status" aria-hidden="true">
            <span>12:45</span>
            <span className="phone-camera" />
            <span className="phone-indicators">
              <span className="phone-wifi" />
              <span className="phone-signal" />
              <span className="phone-battery">85</span>
            </span>
          </div>
          <div className="phone-content">{children}</div>
          <div className="phone-gesture" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
