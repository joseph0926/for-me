import { useState, type FormEvent } from "react";

import { Icon } from "./Icon";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SubscribeForm({ subscribedEmail, onSubscribe }: { subscribedEmail: string | null; onSubscribe: (email: string) => void }) {
  const [draft, setDraft] = useState("");
  const [showError, setShowError] = useState(false);
  const invalid = !emailPattern.test(draft.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (invalid) {
      setShowError(true);
      return;
    }
    onSubscribe(draft.trim());
  };

  return (
    <section id="subscribe" className="scroll-mt-24 rounded-md bg-sunken p-5">
      <h2 className="text-[15px] font-bold">새 글 구독</h2>
      {subscribedEmail ? (
        <p className="mt-3 flex items-start gap-2 text-[14px] text-body">
          <Icon name="check" className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            구독한 주소
            <strong className="mt-1 block font-semibold break-all text-ink">{subscribedEmail}</strong>
          </span>
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-3">
          {/* 저장 방식을 알리던 안내문은 읽는 사람의 할 일과 상관이 없어 뺐다. 새로고침하면 처음 상태라는 점은 README가 맡는다. */}
          <label className="block text-sm font-semibold" htmlFor="subscribe-email">이메일 주소</label>
          <div className="mt-1 flex gap-2">
            <input
              id="subscribe-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={draft}
              aria-invalid={showError && invalid}
              aria-describedby={showError && invalid ? "subscribe-error" : undefined}
              onChange={(event) => setDraft(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-[14px] outline-none focus:border-accent"
            />
            <button type="submit" className="btn-primary shrink-0">
              구독
            </button>
          </div>
          {showError && invalid ? (
            <p id="subscribe-error" className="mt-2 text-[13px] text-accent">
              이메일 주소를 확인해 주세요.
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
