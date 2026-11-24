// 뒤로 가기와 스크롤 위치. 앱 안에서 이동한 적이 있으면 브라우저 뒤로 가기를, 링크로 바로 들어왔으면 홈으로 간다.
// 뒤로 가기로 돌아온 화면은 떠날 때의 스크롤 위치로, 새로 연 화면은 맨 위에서 시작한다.

let inAppMoves = 0;
let lastWasPop = false;
let lastWasReplace = false;
let currentHash = window.location.hash;
const scrollByHash = new Map<string, number>();

window.addEventListener("popstate", () => {
  lastWasPop = true;
});
window.addEventListener("scroll", () => scrollByHash.set(currentHash, window.scrollY), { passive: true });

// 주소를 덮어쓴 이동(검색어 입력 등)은 뒤로 갈 기록이 생기지 않으므로 세지 않는다.
export function noteReplace() {
  lastWasReplace = true;
}

// 새 화면을 그린 직후(화면에 칠하기 전) 부른다. 돌아갈 스크롤 위치를 준다.
export function enterRoute(nextHash: string): number {
  currentHash = nextHash;
  let restored = 0;
  if (lastWasPop) {
    restored = scrollByHash.get(nextHash) ?? 0;
    inAppMoves = Math.max(0, inAppMoves - 1);
  } else if (!lastWasReplace) {
    inAppMoves += 1;
  }
  lastWasPop = false;
  lastWasReplace = false;
  return restored;
}

export function goBack() {
  if (inAppMoves > 0) {
    window.history.back();
    return;
  }
  noteReplace();
  window.history.replaceState(null, "", "#/");
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
