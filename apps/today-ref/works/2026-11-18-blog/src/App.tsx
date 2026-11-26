import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { SearchDialog } from "./components/SearchDialog";
import { SiteHeader } from "./components/SiteHeader";
import { postBySlug } from "./data";
import { savedScroll, useRoute } from "./route";
import { Home } from "./screens/Home";
import { PostPage } from "./screens/PostPage";

function copyWithSelection(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export function App() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);
  const [likedSlugs, setLikedSlugs] = useState<string[]>([]);
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const routeKey = route.page === "post" ? `post:${route.slug}` : `home:${route.category ?? ""}`;

  // 목록으로 돌아오면 읽던 자리로, 글은 맨 위에서 시작한다.
  // 브라우저가 기억한 오래된 위치로 한 번 더 옮기면 이 복원과 부딪쳐서, 복원은 이 앱만 한다.
  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);
  useLayoutEffect(() => {
    const saved = routeKey.startsWith("home:") ? savedScroll(window.location.hash) : undefined;
    window.scrollTo({ top: saved ?? 0 });
  }, [routeKey]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast("링크를 복사했습니다");
    } catch {
      // 클립보드 권한이 없는 브라우저에서는 숨은 입력란을 골라 복사하는 옛 방식으로 한 번 더 시도한다.
      showToast(copyWithSelection(url) ? "링크를 복사했습니다" : "링크를 복사하지 못했습니다. 주소창의 주소를 복사해 주세요");
    }
  };

  const subscribe = (email: string) => {
    setSubscribedEmail(email);
    showToast("구독했습니다");
  };

  const goToSubscribe = () => {
    document.getElementById("subscribe")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("subscribe-email")?.focus({ preventScroll: true });
  };

  const post = route.page === "post" ? postBySlug(route.slug) : undefined;

  useEffect(() => {
    document.title = post ? `${post.title} | 오후의 서랍` : route.page === "home" && route.category ? `${route.category} | 오후의 서랍` : "오후의 서랍";
  }, [post, route]);

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-3 focus:z-50 focus:bg-surface focus:p-3" onClick={(event) => {
        event.preventDefault();
        document.getElementById("main-content")?.focus();
      }}>본문으로 이동</a>
      {route.page === "post" && post ? (
        <PostPage
          key={post.slug}
          post={post}
          liked={likedSlugs.includes(post.slug)}
          onToggleLike={() =>
            setLikedSlugs((current) => (current.includes(post.slug) ? current.filter((slug) => slug !== post.slug) : [...current, post.slug]))
          }
          onShare={share}
          subscribedEmail={subscribedEmail}
          onSubscribe={subscribe}
        />
      ) : (
        <>
          <SiteHeader category={route.page === "home" ? route.category : null} onSearch={() => setSearchOpen(true)} onSubscribe={goToSubscribe} />
          {route.page === "post" ? (
            <main id="main-content" tabIndex={-1} className="mx-auto max-w-xl px-5 py-24 text-center">
              <h1 className="text-2xl font-extrabold">글을 찾지 못했습니다</h1>
              <p className="mt-2 text-muted">주소가 바뀌었거나 지워진 글입니다.</p>
              <a href="#/" className="btn-primary mt-6">
                처음으로
              </a>
            </main>
          ) : (
            <Home category={route.category} subscribedEmail={subscribedEmail} onSubscribe={subscribe} />
          )}
        </>
      )}

      {searchOpen ? <SearchDialog onClose={() => setSearchOpen(false)} /> : null}

      <AnimatePresence>
        {toast ? (
          // 알림은 흐림이 걷히며 나타나고 같은 길(0.97배, 4px 흐림)로 220ms에 사라진다. 모서리는 6px, 알약 모양은 태그에만 쓴다.
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-md bg-ink px-5 py-3 text-center text-[14px] font-medium text-surface"
          >
            {toast.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
