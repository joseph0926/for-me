import { useSyncExternalStore } from "react";

import { categories, type Category } from "./data";

// 주소의 # 뒤를 화면 상태로 쓴다. 뒤로 가기와 새로고침이 그대로 동작한다.
export type Route = { page: "home"; category: Category | null } | { page: "post"; slug: string };

export function parseRoute(hash: string): Route {
  const path = decodeURIComponent(hash.replace(/^#/, ""));
  const post = path.match(/^\/post\/([a-z0-9-]+)$/);
  if (post) return { page: "post", slug: post[1] };
  const category = path.match(/^\/c\/(.+)$/)?.[1];
  const known = categories.find((entry) => entry === category);
  return { page: "home", category: known ?? null };
}

export function hrefFor(route: Route): string {
  if (route.page === "post") return `#/post/${route.slug}`;
  return route.category ? `#/c/${encodeURIComponent(route.category)}` : "#/";
}

// 화면을 떠날 때의 스크롤 위치. hashchange 시점에는 아직 이전 화면이 그려져 있어 위치가 정확하다.
// 스크롤 이벤트로 저장하면 탭이 가려져 있을 때 이벤트가 오지 않아 위치를 잃는다.
const scrollPositions = new Map<string, number>();
let shownHash = window.location.hash;

export function savedScroll(hash: string): number | undefined {
  return scrollPositions.get(hash || "#/");
}

function subscribe(onChange: () => void) {
  const handle = () => {
    scrollPositions.set(shownHash || "#/", window.scrollY);
    shownHash = window.location.hash;
    onChange();
  };
  window.addEventListener("hashchange", handle);
  return () => window.removeEventListener("hashchange", handle);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
