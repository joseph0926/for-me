import { useState } from "react";

type CopyState = "idle" | "copied" | "failed";

// 마지막으로 복사를 시도한 글자와 지금 글자가 같을 때만 결과를 보여 준다. 내용이 바뀌면 저절로 idle로 돌아간다.
export function useCopy(text: string): [CopyState, () => void] {
  const [attempt, setAttempt] = useState<{ text: string; ok: boolean } | null>(null);
  const state: CopyState = attempt?.text !== text ? "idle" : attempt.ok ? "copied" : "failed";

  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setAttempt({ text, ok: true }),
      () => setAttempt({ text, ok: copyWithSelection(text) }),
    );
  };
  return [state, copy];
}

// 앱 안 브라우저처럼 Clipboard API 권한을 주지 않는 환경을 위한 예전 방식이다.
function copyWithSelection(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
