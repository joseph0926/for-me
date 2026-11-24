// 주소의 # 뒤를 화면 상태로 쓴다. 새로 고침과 뒤로 가기, 링크 공유가 그대로 동작한다.
import { useSyncExternalStore } from "react";

import { noteReplace } from "./history";
import type { FeedId } from "./store";

export type ProfileTab = "posts" | "replies" | "media";
export type NotificationFilter = "all" | "replies";

export type Route =
  | { name: "home"; feed: FeedId }
  | { name: "explore"; q: string }
  | { name: "notifications"; filter: NotificationFilter }
  | { name: "saved" }
  | { name: "profile"; handle: string; tab: ProfileTab }
  | { name: "post"; id: string };

const feeds: FeedId[] = ["for-you", "following", "photos", "books"];
const profileTabs: ProfileTab[] = ["posts", "replies", "media"];

export function parseRoute(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "explore") return { name: "explore", q: params.get("q") ?? "" };
  if (parts[0] === "notifications") return { name: "notifications", filter: parts[1] === "replies" ? "replies" : "all" };
  if (parts[0] === "saved") return { name: "saved" };
  if (parts[0] === "post" && parts[1]) return { name: "post", id: parts[1] };
  if (parts[0] === "u" && parts[1]) {
    const tab = profileTabs.find((item) => item === parts[2]) ?? "posts";
    return { name: "profile", handle: parts[1], tab };
  }
  const feed = feeds.find((item) => item === parts[0]) ?? "for-you";
  return { name: "home", feed };
}

export function href(route: Route): string {
  switch (route.name) {
    case "home":
      return route.feed === "for-you" ? "#/" : `#/${route.feed}`;
    case "explore":
      return route.q ? `#/explore?q=${encodeURIComponent(route.q)}` : "#/explore";
    case "notifications":
      return route.filter === "all" ? "#/notifications" : "#/notifications/replies";
    case "saved":
      return "#/saved";
    case "profile":
      return `#/u/${encodeURIComponent(route.handle)}${route.tab === "posts" ? "" : `/${route.tab}`}`;
    case "post":
      return `#/post/${encodeURIComponent(route.id)}`;
  }
}

export function navigate(route: Route, options: { replace?: boolean } = {}) {
  goToHash(href(route), options);
}

// 앱 안의 이동은 모두 pushState로 한다. 링크의 기본 # 이동은 popstate를 함께 내서 뒤로 가기와 구별되지 않기 때문이다.
export function goToHash(target: string, options: { replace?: boolean } = {}) {
  if (target === window.location.hash && !options.replace) return;
  if (options.replace) {
    noteReplace();
    window.history.replaceState(null, "", target);
  } else {
    window.history.pushState(null, "", target);
  }
  // pushState와 replaceState는 hashchange를 내지 않으므로 직접 알린다.
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function useHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

// 글 상세와 프로필은 목록보다 한 단계 깊다. 깊이가 커지면 앞으로, 작아지면 뒤로 간 것으로 보고 전환 방향을 정한다.
export function routeDepth(route: Route) {
  return route.name === "post" || route.name === "profile" ? 1 : 0;
}

// 같은 화면 안에서 탭만 바뀌면 화면 전환 없이 탭 패널만 바꾼다.
export function screenKey(route: Route) {
  switch (route.name) {
    case "profile":
      return `profile:${route.handle}`;
    case "post":
      return `post:${route.id}`;
    default:
      return route.name;
  }
}
