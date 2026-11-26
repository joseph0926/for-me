// 가상의 웹 분석 데이터. 서버 없이 사이트, 기간, 필터만으로 매번 같은 값을 만든다.
// 시각은 KST 벽시계 값을 UTC 필드에 담아 다루므로 읽을 때는 getUTC*를 쓴다.

export type SiteId = "store" | "partner" | "magazine";
export type PeriodId = "24h" | "7d" | "30d";
export type DimensionId =
  | "channel"
  | "source"
  | "campaign"
  | "page"
  | "entry"
  | "exit"
  | "country"
  | "region"
  | "device"
  | "browser"
  | "os";

export interface Filter {
  dimension: DimensionId;
  value: string;
  // 출처와 캠페인은 채널, 지역은 국가에 속한다. 상위 값과 어긋나는 필터를 정리할 때 쓴다.
  group?: string;
}

export interface Totals {
  visitors: number;
  pageviews: number;
  bounce: number; // 이탈률(%)
  duration: number; // 평균 체류 시간(초)
}

export interface SeriesPoint extends Totals {
  at: number;
  partial: boolean;
}

export interface ListRow {
  label: string;
  value: number;
  group?: string;
}

export type Lists = Record<DimensionId, ListRow[]>;

export interface Dashboard {
  points: SeriesPoint[];
  totals: Totals;
  previous: Totals;
  lists: Lists;
}

export const NOW = Date.UTC(2026, 10, 18, 14, 37);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const TODAY_START = Date.UTC(2026, 10, 18);
const CURRENT_HOUR_START = Date.UTC(2026, 10, 18, 14);
const MINUTES_INTO_HOUR = 37;

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "24h", label: "24시간" },
  { id: "7d", label: "7일" },
  { id: "30d", label: "30일" },
];

export const DIMENSIONS: Record<DimensionId, { label: string; tabLabel: string }> = {
  channel: { label: "채널", tabLabel: "채널" },
  source: { label: "출처", tabLabel: "출처" },
  campaign: { label: "캠페인", tabLabel: "캠페인" },
  page: { label: "페이지", tabLabel: "상위 페이지" },
  entry: { label: "진입 페이지", tabLabel: "진입 페이지" },
  exit: { label: "이탈 페이지", tabLabel: "이탈 페이지" },
  country: { label: "국가", tabLabel: "국가" },
  region: { label: "지역", tabLabel: "지역" },
  device: { label: "기기", tabLabel: "기기" },
  browser: { label: "브라우저", tabLabel: "브라우저" },
  os: { label: "운영체제", tabLabel: "운영체제" },
};

// 목록 카드 하나와 필터 메뉴의 한 묶음이 같은 차원들을 공유한다.
export const DIMENSION_GROUPS: { label: string; dimensions: DimensionId[] }[] = [
  { label: "유입", dimensions: ["channel", "source", "campaign"] },
  { label: "페이지", dimensions: ["page", "entry", "exit"] },
  { label: "위치", dimensions: ["country", "region"] },
  { label: "기술", dimensions: ["device", "browser", "os"] },
];

// 하위 차원의 행은 group에 상위 차원의 값을 갖는다.
const PARENT_OF: Partial<Record<DimensionId, DimensionId>> = {
  source: "channel",
  campaign: "channel",
  region: "country",
};

// ---------------------------------------------------------------------------
// 사이트 정의

type RowDef = [label: string, weight: number, group?: string];

interface DimensionDef {
  rows: RowDef[];
  // 있으면 비중의 합을 이 값에 맞추고, 없으면 weight를 방문자 대비 비율로 그대로 쓴다.
  total?: number;
}

interface SiteProfile {
  name: string;
  domain: string;
  live: number;
  dailyVisitors: number;
  weekday: [number, number, number, number, number, number, number]; // 일요일부터
  hourly: number[];
  // 며칠 전의 트래픽 배수. 행사, 장애, 화제가 된 글 같은 사건을 흉내 낸다.
  events: Record<number, number>;
  pagesPerVisit: number;
  bounce: number;
  duration: number;
  // 하루 전으로 갈수록 더해지는 이탈률(%p)과 곱해지는 체류 시간 변화. 기간 비교에 추세를 만든다.
  drift: { bounce: number; duration: number };
  dims: Record<Exclude<DimensionId, "channel">, DimensionDef>;
}

const EVENING_HOURS = [
  0.62, 0.41, 0.27, 0.19, 0.15, 0.17, 0.28, 0.48, 0.71, 0.86, 0.93, 0.98, 1.12, 1.08, 0.96, 0.94,
  0.97, 1.0, 0.98, 1.06, 1.21, 1.34, 1.31, 0.98,
];
const OFFICE_HOURS = [
  0.08, 0.05, 0.03, 0.02, 0.02, 0.04, 0.1, 0.3, 0.7, 1.25, 1.4, 1.35, 0.9, 1.2, 1.38, 1.32, 1.24,
  1.1, 0.72, 0.45, 0.4, 0.38, 0.3, 0.17,
];

const KOREA_REGIONS: RowDef[] = [
  ["서울", 0.331, "대한민국"],
  ["경기", 0.287, "대한민국"],
  ["부산", 0.061, "대한민국"],
  ["인천", 0.055, "대한민국"],
  ["경남", 0.04, "대한민국"],
  ["대구", 0.038, "대한민국"],
  ["대전", 0.031, "대한민국"],
  ["광주", 0.026, "대한민국"],
  ["충남", 0.025, "대한민국"],
  ["경북", 0.022, "대한민국"],
  ["전북", 0.019, "대한민국"],
  ["충북", 0.018, "대한민국"],
  ["강원", 0.017, "대한민국"],
  ["울산", 0.015, "대한민국"],
  ["전남", 0.014, "대한민국"],
  ["제주", 0.012, "대한민국"],
  ["세종", 0.008, "대한민국"],
];

const SITES: Record<SiteId, SiteProfile> = {
  store: {
    name: "소담책방 스토어",
    domain: "sodambook.kr",
    live: 41,
    dailyVisitors: 7380,
    weekday: [1.12, 0.94, 0.97, 0.99, 1.0, 0.91, 1.08],
    hourly: EVENING_HOURS,
    events: { 4: 1.18, 5: 1.94, 12: 0.57, 25: 1.24, 40: 1.46, 41: 1.12 },
    pagesPerVisit: 4.1,
    bounce: 39.6,
    duration: 221,
    drift: { bounce: 0.11, duration: -0.0042 },
    dims: {
      source: {
        total: 1,
        rows: [
          ["직접 방문", 0.262, "직접 방문"],
          ["search.naver.com", 0.214, "자연 검색"],
          ["google.com", 0.094, "자연 검색"],
          ["instagram.com", 0.071, "소셜"],
          ["뉴스레터", 0.058, "이메일"],
          ["m.blog.naver.com", 0.048, "추천 링크"],
          ["카카오톡", 0.046, "소셜"],
          ["ad.search.naver.com", 0.029, "유료 검색"],
          ["search.daum.net", 0.027, "자연 검색"],
          ["youtube.com", 0.022, "소셜"],
          ["brunch.co.kr", 0.016, "추천 링크"],
          ["x.com", 0.013, "소셜"],
          ["threads.net", 0.011, "소셜"],
          ["chatgpt.com", 0.009, "추천 링크"],
          ["googleads.g.doubleclick.net", 0.008, "디스플레이 광고"],
          ["bing.com", 0.006, "자연 검색"],
          ["namu.wiki", 0.005, "추천 링크"],
          ["facebook.com", 0.004, "소셜"],
        ],
      },
      campaign: {
        rows: [
          ["2611_bookfesta_main", 0.044, "소셜"],
          ["newsletter_w46", 0.031, "이메일"],
          ["naver_bs_brand", 0.022, "유료 검색"],
          ["insta_reels_essay", 0.019, "소셜"],
          ["kakao_ch_1115", 0.017, "소셜"],
          ["newsletter_w45", 0.012, "이메일"],
          ["author_talk_1121", 0.009, "소셜"],
          ["gdn_retarget_nov", 0.008, "디스플레이 광고"],
          ["blog_review_kit", 0.006, "추천 링크"],
          ["winback_dormant_90d", 0.005, "이메일"],
        ],
      },
      page: {
        rows: [
          ["/", 0.462],
          ["/event/2611-book-festa", 0.214],
          ["/search", 0.188],
          ["/books/best", 0.143],
          ["/category/novel", 0.097],
          ["/books/9791190090018", 0.081],
          ["/cart", 0.074],
          ["/category/essay", 0.069],
          ["/login", 0.054],
          ["/books/9788954699914", 0.052],
          ["/my/library", 0.047],
          ["/order/checkout", 0.041],
          ["/books/new", 0.038],
          ["/order/complete", 0.029],
          ["/category/kids", 0.024],
          ["/books/9791168340923", 0.021],
          ["/author/a-1042", 0.018],
          ["/event/membership-day", 0.016],
          ["/cs/faq", 0.012],
          ["/books/9788937462788", 0.011],
        ],
      },
      entry: {
        total: 1,
        rows: [
          ["/", 0.361],
          ["/event/2611-book-festa", 0.168],
          ["/books/9791190090018", 0.071],
          ["/books/best", 0.058],
          ["/search", 0.051],
          ["/books/9788954699914", 0.043],
          ["/category/novel", 0.031],
          ["/my/library", 0.029],
          ["/login", 0.022],
          ["/books/9791168340923", 0.019],
          ["/event/membership-day", 0.012],
          ["/author/a-1042", 0.009],
          ["/cs/faq", 0.008],
        ],
      },
      exit: {
        total: 1,
        rows: [
          ["/", 0.207],
          ["/event/2611-book-festa", 0.131],
          ["/search", 0.118],
          ["/order/complete", 0.106],
          ["/cart", 0.089],
          ["/books/9791190090018", 0.078],
          ["/books/best", 0.069],
          ["/my/library", 0.048],
          ["/login", 0.041],
          ["/category/essay", 0.032],
          ["/order/checkout", 0.029],
          ["/books/9788954699914", 0.024],
          ["/cs/faq", 0.011],
        ],
      },
      country: {
        total: 1,
        rows: [
          ["대한민국", 0.921, "대한민국"],
          ["미국", 0.024],
          ["일본", 0.012],
          ["캐나다", 0.008],
          ["호주", 0.006],
          ["베트남", 0.005],
          ["독일", 0.004],
          ["싱가포르", 0.004],
          ["중국", 0.003],
          ["영국", 0.003],
          ["대만", 0.002],
          ["프랑스", 0.002],
        ],
      },
      region: { total: 0.921, rows: KOREA_REGIONS },
      device: {
        total: 1,
        rows: [
          ["모바일", 0.712],
          ["데스크톱", 0.259],
          ["태블릿", 0.029],
        ],
      },
      browser: {
        total: 1,
        rows: [
          ["Chrome", 0.318],
          ["Safari", 0.287],
          ["삼성 인터넷", 0.142],
          ["네이버 앱", 0.103],
          ["카카오톡 인앱", 0.058],
          ["Whale", 0.041],
          ["Edge", 0.033],
          ["Instagram 인앱", 0.012],
          ["Firefox", 0.006],
        ],
      },
      os: {
        total: 1,
        rows: [
          ["Android", 0.402],
          ["iOS", 0.331],
          ["Windows", 0.187],
          ["macOS", 0.058],
          ["iPadOS", 0.019],
          ["Linux", 0.003],
        ],
      },
    },
  },
  partner: {
    name: "작가 파트너센터",
    domain: "partner.sodambook.kr",
    live: 6,
    dailyVisitors: 640,
    weekday: [0.46, 1.09, 1.12, 1.1, 1.06, 1.0, 0.55],
    hourly: OFFICE_HOURS,
    events: { 1: 1.74, 8: 0.81, 31: 1.66, 32: 1.2 },
    pagesPerVisit: 6.3,
    bounce: 27.9,
    duration: 498,
    drift: { bounce: -0.05, duration: 0.0021 },
    dims: {
      source: {
        total: 1,
        rows: [
          ["직접 방문", 0.518, "직접 방문"],
          ["정산 알림 메일", 0.142, "이메일"],
          ["search.naver.com", 0.118, "자연 검색"],
          ["카카오톡", 0.071, "소셜"],
          ["google.com", 0.061, "자연 검색"],
          ["sodambook.kr", 0.058, "추천 링크"],
          ["mail.naver.com", 0.026, "이메일"],
          ["brunch.co.kr", 0.006, "추천 링크"],
        ],
      },
      campaign: {
        rows: [
          ["settlement_notice_1117", 0.118, "이메일"],
          ["policy_update_nov", 0.034, "이메일"],
          ["onboarding_d3", 0.012, "이메일"],
          ["kakao_partner_1110", 0.009, "소셜"],
        ],
      },
      page: {
        rows: [
          ["/dashboard", 0.781],
          ["/settlement", 0.412],
          ["/settlement/2026-10", 0.287],
          ["/books/manage", 0.244],
          ["/stats/sales", 0.198],
          ["/login", 0.176],
          ["/books/new", 0.083],
          ["/notice/1182", 0.071],
          ["/contract", 0.044],
          ["/help/tax-invoice", 0.038],
          ["/settings/account", 0.027],
          ["/notice/1179", 0.019],
        ],
      },
      entry: {
        total: 1,
        rows: [
          ["/login", 0.412],
          ["/dashboard", 0.284],
          ["/settlement/2026-10", 0.131],
          ["/notice/1182", 0.062],
          ["/help/tax-invoice", 0.034],
          ["/books/manage", 0.029],
          ["/stats/sales", 0.018],
        ],
      },
      exit: {
        total: 1,
        rows: [
          ["/settlement/2026-10", 0.236],
          ["/dashboard", 0.214],
          ["/stats/sales", 0.142],
          ["/books/manage", 0.118],
          ["/login", 0.071],
          ["/books/new", 0.052],
          ["/help/tax-invoice", 0.043],
          ["/contract", 0.031],
        ],
      },
      country: {
        total: 1,
        rows: [
          ["대한민국", 0.968, "대한민국"],
          ["미국", 0.011],
          ["일본", 0.008],
          ["캐나다", 0.004],
          ["독일", 0.003],
        ],
      },
      region: { total: 0.968, rows: KOREA_REGIONS },
      device: {
        total: 1,
        rows: [
          ["데스크톱", 0.684],
          ["모바일", 0.289],
          ["태블릿", 0.027],
        ],
      },
      browser: {
        total: 1,
        rows: [
          ["Chrome", 0.512],
          ["Safari", 0.171],
          ["Edge", 0.112],
          ["Whale", 0.094],
          ["삼성 인터넷", 0.061],
          ["네이버 앱", 0.032],
          ["Firefox", 0.011],
        ],
      },
      os: {
        total: 1,
        rows: [
          ["Windows", 0.493],
          ["macOS", 0.196],
          ["Android", 0.161],
          ["iOS", 0.128],
          ["iPadOS", 0.018],
          ["Linux", 0.004],
        ],
      },
    },
  },
  magazine: {
    name: "소담 매거진",
    domain: "magazine.sodambook.kr",
    live: 17,
    dailyVisitors: 2290,
    weekday: [1.18, 0.9, 0.95, 0.97, 0.96, 0.98, 1.15],
    hourly: EVENING_HOURS,
    events: { 7: 1.31, 8: 1.92, 9: 3.38, 22: 1.41, 46: 1.6 },
    pagesPerVisit: 1.8,
    bounce: 61.8,
    duration: 151,
    drift: { bounce: 0.07, duration: -0.0036 },
    dims: {
      source: {
        total: 1,
        rows: [
          ["threads.net", 0.198, "소셜"],
          ["search.naver.com", 0.187, "자연 검색"],
          ["instagram.com", 0.142, "소셜"],
          ["직접 방문", 0.131, "직접 방문"],
          ["x.com", 0.084, "소셜"],
          ["google.com", 0.071, "자연 검색"],
          ["카카오톡", 0.058, "소셜"],
          ["sodambook.kr", 0.043, "추천 링크"],
          ["뉴스레터", 0.036, "이메일"],
          ["m.blog.naver.com", 0.024, "추천 링크"],
          ["facebook.com", 0.011, "소셜"],
          ["search.daum.net", 0.009, "자연 검색"],
          ["namu.wiki", 0.004, "추천 링크"],
        ],
      },
      campaign: {
        rows: [
          ["magazine_letter_w46", 0.029, "이메일"],
          ["threads_reread_essay", 0.024, "소셜"],
          ["insta_card_winter_list", 0.017, "소셜"],
          ["store_banner_magazine", 0.011, "추천 링크"],
        ],
      },
      page: {
        rows: [
          ["/article/why-we-reread", 0.392],
          ["/", 0.214],
          ["/article/2611-winter-reading-list", 0.181],
          ["/interview/poet-jeju-studio", 0.112],
          ["/article/bookstore-night-shift", 0.074],
          ["/series/first-sentence", 0.061],
          ["/article/kids-picture-books-10", 0.048],
          ["/interview/translator-han", 0.037],
          ["/series/first-sentence/14", 0.029],
          ["/about", 0.012],
        ],
      },
      entry: {
        total: 1,
        rows: [
          ["/article/why-we-reread", 0.371],
          ["/article/2611-winter-reading-list", 0.164],
          ["/", 0.121],
          ["/interview/poet-jeju-studio", 0.104],
          ["/article/bookstore-night-shift", 0.069],
          ["/series/first-sentence", 0.041],
          ["/article/kids-picture-books-10", 0.039],
          ["/interview/translator-han", 0.028],
        ],
      },
      exit: {
        total: 1,
        rows: [
          ["/article/why-we-reread", 0.382],
          ["/article/2611-winter-reading-list", 0.158],
          ["/interview/poet-jeju-studio", 0.108],
          ["/", 0.087],
          ["/article/bookstore-night-shift", 0.071],
          ["/article/kids-picture-books-10", 0.044],
          ["/series/first-sentence/14", 0.031],
          ["/interview/translator-han", 0.027],
        ],
      },
      country: {
        total: 1,
        rows: [
          ["대한민국", 0.903, "대한민국"],
          ["미국", 0.031],
          ["일본", 0.017],
          ["캐나다", 0.012],
          ["호주", 0.009],
          ["독일", 0.006],
          ["영국", 0.005],
          ["베트남", 0.004],
          ["프랑스", 0.003],
        ],
      },
      region: { total: 0.903, rows: KOREA_REGIONS },
      device: {
        total: 1,
        rows: [
          ["모바일", 0.834],
          ["데스크톱", 0.141],
          ["태블릿", 0.025],
        ],
      },
      browser: {
        total: 1,
        rows: [
          ["Safari", 0.304],
          ["Chrome", 0.231],
          ["Threads 인앱", 0.142],
          ["Instagram 인앱", 0.118],
          ["삼성 인터넷", 0.094],
          ["네이버 앱", 0.071],
          ["카카오톡 인앱", 0.031],
          ["Whale", 0.009],
        ],
      },
      os: {
        total: 1,
        rows: [
          ["iOS", 0.512],
          ["Android", 0.331],
          ["Windows", 0.104],
          ["macOS", 0.041],
          ["iPadOS", 0.012],
        ],
      },
    },
  },
};

export function siteInfo(id: SiteId) {
  const { name, domain, live } = SITES[id];
  return { name, domain, live };
}

// ---------------------------------------------------------------------------
// 결정적 난수

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 같은 키에는 항상 같은 0 이상 1 미만의 값을 돌려준다.
function noise(key: string) {
  let t = (hash(key) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// 시계열

function fullDayVisitors(siteId: SiteId, daysAgo: number) {
  const site = SITES[siteId];
  const weekday = new Date(TODAY_START - daysAgo * DAY).getUTCDay();
  const trend = 1 - 0.0031 * daysAgo;
  const event = site.events[daysAgo] ?? 1;
  const jitter = 0.9 + noise(`${siteId}:day:${daysAgo}`) * 0.2;
  return site.dailyVisitors * site.weekday[weekday] * trend * event * jitter;
}

// 방문 수 외 지표는 사이트 기준값과 추세 주변에서 흔들린다.
// 사건이 있던 날과 새벽 시간대에는 이탈이 늘고 체류가 짧아진다.
function pointMetrics(siteId: SiteId, visitors: number, key: string, daysAgo: number, hour?: number) {
  const site = SITES[siteId];
  const surge = Math.max(0, (site.events[daysAgo] ?? 1) - 1);
  const lateNight = hour !== undefined && hour >= 1 && hour <= 5 ? 1 : 0;
  const pageviews = visitors * site.pagesPerVisit * (0.9 + noise(`${key}:pv`) * 0.2) * (1 - surge * 0.08);
  const bounce = clamp(
    site.bounce + site.drift.bounce * daysAgo + (noise(`${key}:b`) - 0.5) * 9 + surge * 6 + lateNight * 7,
    8,
    92,
  );
  const duration =
    site.duration *
    (1 + site.drift.duration * daysAgo) *
    (0.82 + noise(`${key}:d`) * 0.36) *
    (1 - Math.min(surge, 1) * 0.16) *
    (1 - lateNight * 0.22);
  return { pageviews, bounce, duration };
}

function todayElapsedShare(hourly: number[]) {
  const total = hourly.reduce((sum, v) => sum + v, 0);
  const currentHour = new Date(CURRENT_HOUR_START).getUTCHours();
  const done = hourly.slice(0, currentHour).reduce((sum, v) => sum + v, 0);
  return (done + hourly[currentHour] * (MINUTES_INTO_HOUR / 60)) / total;
}

function dailyPoint(siteId: SiteId, daysAgo: number): SeriesPoint {
  const site = SITES[siteId];
  const partial = daysAgo === 0;
  const full = fullDayVisitors(siteId, daysAgo);
  const visitors = Math.round(partial ? full * todayElapsedShare(site.hourly) : full);
  const metrics = pointMetrics(siteId, visitors, `${siteId}:day:${daysAgo}`, daysAgo);
  return {
    at: TODAY_START - daysAgo * DAY,
    partial,
    visitors,
    pageviews: Math.round(metrics.pageviews),
    bounce: metrics.bounce,
    duration: metrics.duration,
  };
}

function hourlyPoint(siteId: SiteId, hoursAgo: number): SeriesPoint {
  const site = SITES[siteId];
  const at = CURRENT_HOUR_START - hoursAgo * HOUR;
  const hour = new Date(at).getUTCHours();
  const daysAgo = Math.round((TODAY_START - (at - hour * HOUR)) / DAY);
  const hourTotal = site.hourly.reduce((sum, v) => sum + v, 0);
  const partial = hoursAgo === 0;
  const jitter = 0.84 + noise(`${siteId}:hour:${hoursAgo}`) * 0.32;
  const full = (fullDayVisitors(siteId, daysAgo) * site.hourly[hour] * jitter) / hourTotal;
  const visitors = Math.round(partial ? full * (MINUTES_INTO_HOUR / 60) : full);
  const metrics = pointMetrics(siteId, visitors, `${siteId}:hour:${hoursAgo}`, daysAgo, hour);
  return {
    at,
    partial,
    visitors,
    pageviews: Math.round(metrics.pageviews),
    bounce: metrics.bounce,
    duration: metrics.duration,
  };
}

// 7일 보기는 일 단위 점 7개로는 모양이 빈약해서 3시간 묶음으로 촘촘하게 그린다.
export type PointUnit = "hour" | "3h" | "day";

const PERIOD_SPEC: Record<PeriodId, { length: number; unit: PointUnit; uniqueShare: number }> = {
  "24h": { length: 24, unit: "hour", uniqueShare: 0.93 },
  "7d": { length: 56, unit: "3h", uniqueShare: 0.81 },
  "30d": { length: 30, unit: "day", uniqueShare: 0.68 },
};

export function pointUnit(period: PeriodId) {
  return PERIOD_SPEC[period].unit;
}

// 현재 시간대가 든 3시간 묶음부터 거꾸로 센다. 아직 오지 않은 시간은 더하지 않는다.
function threeHourPoint(siteId: SiteId, bucketsAgo: number): SeriesPoint {
  const currentHour = new Date(CURRENT_HOUR_START).getUTCHours();
  const hoursIntoBucket = currentHour % 3;
  const hours: SeriesPoint[] = [];
  for (let h = 0; h < 3; h++) {
    const hoursAgo = bucketsAgo * 3 + hoursIntoBucket - h;
    if (hoursAgo >= 0) hours.push(hourlyPoint(siteId, hoursAgo));
  }
  const visitors = hours.reduce((sum, p) => sum + p.visitors, 0);
  const weighted = (pick: (p: SeriesPoint) => number) =>
    visitors === 0 ? pick(hours[0]) : hours.reduce((sum, p) => sum + pick(p) * p.visitors, 0) / visitors;
  return {
    at: CURRENT_HOUR_START - (bucketsAgo * 3 + hoursIntoBucket) * HOUR,
    partial: bucketsAgo === 0,
    visitors,
    pageviews: hours.reduce((sum, p) => sum + p.pageviews, 0),
    bounce: weighted((p) => p.bounce),
    duration: weighted((p) => p.duration),
  };
}

const POINT_BUILDERS: Record<PointUnit, (siteId: SiteId, ago: number) => SeriesPoint> = {
  hour: hourlyPoint,
  "3h": threeHourPoint,
  day: dailyPoint,
};

// offset 0은 현재 기간, 1은 비교할 직전 기간이다. 오래된 점부터 담는다.
function periodPoints(siteId: SiteId, period: PeriodId, offset: 0 | 1) {
  const { length, unit } = PERIOD_SPEC[period];
  const points: SeriesPoint[] = [];
  for (let i = length - 1; i >= 0; i--) {
    const point = POINT_BUILDERS[unit](siteId, i + offset * length);
    points.push(offset === 1 ? { ...point, partial: false } : point);
  }
  return points;
}

function summarize(points: SeriesPoint[], period: PeriodId): Totals {
  const visits = points.reduce((sum, p) => sum + p.visitors, 0);
  const weighted = (pick: (p: SeriesPoint) => number) =>
    visits === 0 ? 0 : points.reduce((sum, p) => sum + pick(p) * p.visitors, 0) / visits;
  return {
    visitors: Math.round(visits * PERIOD_SPEC[period].uniqueShare),
    pageviews: points.reduce((sum, p) => sum + p.pageviews, 0),
    bounce: weighted((p) => p.bounce),
    duration: weighted((p) => p.duration),
  };
}

// ---------------------------------------------------------------------------
// 목록

function baseLists(siteId: SiteId, period: PeriodId, visitors: number): Lists {
  const site = SITES[siteId];
  const lists = {} as Lists;
  for (const [dimension, def] of Object.entries(site.dims) as [Exclude<DimensionId, "channel">, DimensionDef][]) {
    const shaken = def.rows.map(([label, weight, group]) => ({
      label,
      group,
      weight: weight * (0.84 + noise(`${siteId}:${period}:${dimension}:${label}`) * 0.32),
    }));
    const sum = shaken.reduce((acc, row) => acc + row.weight, 0);
    const scale = def.total === undefined ? 1 : def.total / sum;
    lists[dimension] = shaken
      .map(({ label, group, weight }) => ({ label, group, value: Math.round(visitors * weight * scale) }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }
  lists.channel = channelsFromSources(lists.source);
  return lists;
}

function channelsFromSources(sources: ListRow[]): ListRow[] {
  const byChannel = new Map<string, number>();
  for (const row of sources) {
    if (!row.group) continue;
    byChannel.set(row.group, (byChannel.get(row.group) ?? 0) + row.value);
  }
  return [...byChannel]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// ---------------------------------------------------------------------------
// 필터

function filterKey(filters: Filter[]) {
  return filters
    .map((f) => `${f.dimension}=${f.value}`)
    .sort()
    .join("&");
}

function childrenOf(dimension: DimensionId) {
  return (Object.keys(PARENT_OF) as DimensionId[]).filter((child) => PARENT_OF[child] === dimension);
}

// 필터 조건에 해당하는 방문의 비율. 하위 필터가 있으면 상위 필터는 이미 그 안에 포함된다.
function filterShare(filters: Filter[], lists: Lists, visitors: number) {
  let share = 1;
  for (const filter of filters) {
    const coveredByChild = filters.some((other) => PARENT_OF[other.dimension] === filter.dimension);
    if (coveredByChild) continue;
    const row = lists[filter.dimension].find((r) => r.label === filter.value);
    share *= row ? Math.min(row.value / visitors, 0.97) : 0.02;
  }
  return share;
}

function filterPoints(points: SeriesPoint[], share: number, key: string): SeriesPoint[] {
  const bounceShift = (noise(`${key}:bounce`) - 0.5) * 16;
  const durationScale = 0.72 + noise(`${key}:duration`) * 0.56;
  return points.map((point, i) => {
    const visitors = Math.round(point.visitors * share * (0.8 + noise(`${key}:${i}`) * 0.4));
    const pagesPerVisit = point.visitors === 0 ? 0 : point.pageviews / point.visitors;
    return {
      ...point,
      visitors,
      pageviews: Math.round(visitors * pagesPerVisit * (0.94 + noise(`${key}:${i}:pv`) * 0.12)),
      bounce: clamp(point.bounce + bounceShift + (noise(`${key}:${i}:b`) - 0.5) * 4, 5, 95),
      duration: point.duration * durationScale,
    };
  });
}

// lists는 필터 전 값이고 baseVisitors는 그때의 방문자 수, visitors는 필터 뒤 방문자 수다.
function filterLists(
  lists: Lists,
  filters: Filter[],
  share: number,
  key: string,
  baseVisitors: number,
  visitors: number,
): Lists {
  const result = {} as Lists;
  for (const dimension of Object.keys(lists) as DimensionId[]) {
    const own = filters.find((f) => f.dimension === dimension);
    if (own) {
      result[dimension] = [{ label: own.value, value: visitors, group: own.group }];
      continue;
    }

    // 하위 차원 필터가 있으면 상위 차원에는 그 필터가 속한 값 하나만 남는다.
    const childFilter = filters.find((f) => childrenOf(dimension).includes(f.dimension));
    if (childFilter?.group) {
      result[dimension] = [{ label: childFilter.group, value: visitors }];
      continue;
    }

    // 상위 차원 필터가 있으면 그 값에 속한 행만 남는다. 행 값에 이미 그 비율이 들어 있으므로 나머지 필터의 비율만 곱한다.
    const parent = PARENT_OF[dimension];
    const parentFilter = parent ? filters.find((f) => f.dimension === parent) : undefined;
    let rows = lists[dimension];
    let rowShare = share;
    if (parentFilter) {
      rows = rows.filter((r) => r.group === parentFilter.value);
      const parentRow = lists[parentFilter.dimension].find((r) => r.label === parentFilter.value);
      const parentShare = parentRow ? Math.min(parentRow.value / baseVisitors, 0.97) : 1;
      // 다른 하위 필터가 상위 값을 대신했다면 share에 상위 비율이 없으므로 나누지 않는다.
      const parentInShare = !filters.some((f) => PARENT_OF[f.dimension] === parent);
      rowShare = parentInShare ? share / parentShare : share;
    }

    result[dimension] = rows
      .map((row) => ({
        ...row,
        value: Math.round(row.value * rowShare * (0.55 + noise(`${key}:${dimension}:${row.label}`) * 0.9)),
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }
  return result;
}

// 같은 차원의 필터는 바꾸고, 상위와 하위 관계가 어긋나는 필터는 뺀다.
export function addFilter(filters: Filter[], next: Filter): Filter[] {
  const kept = filters.filter((f) => {
    if (f.dimension === next.dimension) return false;
    if (PARENT_OF[next.dimension] === f.dimension) return f.value === next.group;
    if (PARENT_OF[f.dimension] === next.dimension) return f.group === next.value;
    return true;
  });
  return [...kept, next];
}

// ---------------------------------------------------------------------------

export function buildDashboard(siteId: SiteId, period: PeriodId, filters: Filter[]): Dashboard {
  const points = periodPoints(siteId, period, 0);
  const previousPoints = periodPoints(siteId, period, 1);
  const totals = summarize(points, period);
  const lists = baseLists(siteId, period, totals.visitors);
  if (filters.length === 0) {
    return { points, totals, previous: summarize(previousPoints, period), lists };
  }

  const key = filterKey(filters);
  const share = filterShare(filters, lists, totals.visitors);
  const filteredPoints = filterPoints(points, share, key);
  const filteredTotals = summarize(filteredPoints, period);
  return {
    points: filteredPoints,
    totals: filteredTotals,
    previous: summarize(filterPoints(previousPoints, share, `${key}:prev`), period),
    lists: filterLists(lists, filters, share, key, totals.visitors, filteredTotals.visitors),
  };
}
