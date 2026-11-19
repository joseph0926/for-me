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
    <section id="subscribe" className="scroll-mt-24 border-t-2 border-ink bg-sunken p-5">
      <h2 className="text-[15px] font-bold">새 글 구독</h2>
      {subscribedEmail ? (
        <p className="mt-3 flex items-start gap-2 text-[14px] text-body">
          <Icon name="check" className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            이번 방문에 등록한 이메일
            <strong className="mt-1 block font-semibold break-all text-ink">{subscribedEmail}</strong>
          </span>
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-3">
          <p className="text-[13px] text-muted">이메일 주소는 이번 방문 동안만 저장됩니다.</p>
          <label className="mt-3 block text-sm font-semibold" htmlFor="subscribe-email">이메일 주소</label>
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
              className="h-11 min-w-0 flex-1 rounded-sm border border-line bg-surface px-3 text-[14px] outline-none focus:border-accent"
            />
            <button type="submit" className="h-11 shrink-0 rounded-sm bg-ink px-4 text-[14px] font-semibold text-surface">
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
