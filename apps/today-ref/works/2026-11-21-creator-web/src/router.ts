import { useSyncExternalStore } from "react";

import { creators } from "./data";

// 화면 위치를 주소의 # 뒤에 둔다. 새로고침과 공유 링크, 브라우저 뒤로 가기가 같은 화면을 연다.
export type CreatorTab = "home" | "posts" | "fans" | "schedule" | "membership";

export const CREATOR_TABS: CreatorTab[] = ["home", "posts", "fans", "schedule", "membership"];

export type Route =
  | { name: "home" }
  | { name: "explore" }
  | { name: "alerts" }
  | { name: "me" }
  | { name: "creator"; creatorId: string; tab: CreatorTab }
  | { name: "post"; postId: string }
  | { name: "live"; creatorId: string }
  | { name: "notFound" };

export function toHash(route: Route): string {
  switch (route.name) {
    case "home":
    case "notFound":
      return "#/";
    case "explore":
    case "alerts":
    case "me":
      return `#/${route.name}`;
    case "creator":
      return route.tab === "home" ? `#/c/${route.creatorId}` : `#/c/${route.creatorId}/${route.tab}`;
    case "post":
      return `#/p/${route.postId}`;
    case "live":
      return `#/live/${route.creatorId}`;
  }
}

const isCreator = (id: string) => creators.some((creator) => creator.id === id);

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [head, id, sub] = parts;
  if (!head) return { name: "home" };
  if ((head === "explore" || head === "alerts" || head === "me") && !id) return { name: head };
  if (head === "c" && id && isCreator(id)) {
    if (!sub) return { name: "creator", creatorId: id, tab: "home" };
    if ((CREATOR_TABS as string[]).includes(sub)) return { name: "creator", creatorId: id, tab: sub as CreatorTab };
  }
  // 글은 내가 새로 쓴 것도 있어 상태에서 찾아야 하므로 여기서는 형태만 본다.
  if (head === "p" && id && !sub) return { name: "post", postId: id };
  if (head === "live" && id && isCreator(id) && !sub) return { name: "live", creatorId: id };
  return { name: "notFound" };
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

export function navigate(route: Route) {
  const next = toHash(route);
  if (window.location.hash !== next) window.location.hash = next;
}
