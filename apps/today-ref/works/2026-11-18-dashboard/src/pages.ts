import type { SiteId } from "./data";
import type { IconName } from "./icons";

export type PageId = "inbox" | SiteId | "goals" | "reports";

interface PageBase {
  id: PageId;
  label: string;
  icon: IconName;
}

export type PageDef =
  | (PageBase & { kind: "site"; site: SiteId })
  | (PageBase & { kind: "empty"; emptyTitle: string; emptyBody: string });

export interface NavGroup {
  label?: string;
  pages: PageDef[];
}

export const NAV: NavGroup[] = [
  {
    pages: [
      {
        id: "inbox",
        label: "알림",
        icon: "inbox",
        kind: "empty",
        emptyTitle: "새 알림이 없습니다",
        emptyBody: "방문자가 평소보다 크게 늘거나 줄면 사이트별로 알려 드립니다.",
      },
    ],
  },
  {
    label: "사이트",
    pages: [
      { id: "store", label: "소담책방 스토어", icon: "book", kind: "site", site: "store" },
      { id: "partner", label: "작가 파트너센터", icon: "pen", kind: "site", site: "partner" },
      { id: "magazine", label: "소담 매거진", icon: "globe", kind: "site", site: "magazine" },
    ],
  },
  {
    label: "분석 도구",
    pages: [
      {
        id: "goals",
        label: "전환 목표",
        icon: "target",
        kind: "empty",
        emptyTitle: "전환 목표가 없습니다",
        emptyBody: "결제 완료나 회원 가입 같은 이벤트를 목표로 정하면 채널과 페이지별 전환율을 함께 봅니다.",
      },
      {
        id: "reports",
        label: "정기 리포트",
        icon: "report",
        kind: "empty",
        emptyTitle: "예약한 리포트가 없습니다",
        emptyBody: "매주 월요일 오전 9시처럼 시간을 정해 두면 요약을 메일로 받습니다.",
      },
    ],
  },
];

export function findPage(id: PageId) {
  for (const group of NAV) {
    const page = group.pages.find((p) => p.id === id);
    if (page) return { page, group };
  }
  throw new Error(`알 수 없는 페이지: ${id}`);
}
