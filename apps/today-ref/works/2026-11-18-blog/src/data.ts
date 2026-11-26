// 가상의 개인 블로그 "오후의 서랍"의 글. 서버 없이 이 값으로 그린다.

export const blog = {
  name: "오후의 서랍",
  author: "윤서하",
  // 홈 소개 문장은 진한 이름 뒤에 이 말을 잇는다.
  introAfterName: "는 작은 앱을 만들고 고치는 디자이너 겸 개발자입니다. 만들면서 배운 것과 하루의 기록을 천천히 적습니다.",
};

export const categories = ["개발", "디자인", "기록"] as const;
export type Category = (typeof categories)[number];

export interface FigureArt {
  hue: number;
  shape: "keypad" | "compare" | "layers";
}

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string }
  | { type: "figure"; art: FigureArt; title: string; caption: string }
  | { type: "code"; code: string }
  | { type: "list"; items: string[] };

export interface Series {
  id: string;
  name: string;
  ongoing: boolean;
}

export const series: Series[] = [{ id: "small-app", name: "작은 앱 만들기", ongoing: true }];

export interface Post {
  slug: string;
  title: string;
  summary: string;
  category: Category;
  date: string;
  views: number;
  likes: number;
  featured?: boolean;
  series?: { id: string; part: number };
  blocks: Block[];
}

export const posts: Post[] = [
  {
    slug: "small-app-3",
    title: "작은 앱 만들기 3화: 처음 써 본 사람이 멈춘 곳",
    summary: "가족 다섯 명에게 가계부 앱을 건네고 지켜봤습니다. 다들 같은 화면에서 손을 멈췄습니다.",
    category: "개발",
    date: "2026-11-16",
    views: 4820,
    likes: 132,
    featured: true,
    series: { id: "small-app", part: 3 },
    blocks: [
      { type: "p", text: "지난 화에서 만든 첫 버전을 가족 다섯 명에게 설치해 주고, 일주일 동안 쓰는 모습을 옆에서 봤습니다. 설명은 하지 않았고, 물어보면 대답만 했습니다." },
      { type: "quote", text: "“여기서 저장을 누르면 끝난 거야, 아니면 하나 더 해야 해?”" },
      { type: "p", text: "다섯 명 중 넷이 같은 질문을 했습니다. 금액을 넣고 분류를 고른 뒤 저장 버튼이 화면 아래에 가려져 있었기 때문입니다. 키패드가 올라오면 버튼이 사라지는 것을 저는 한 번도 눈치채지 못했습니다." },
      { type: "h2", text: "만든 사람은 길을 외우고 있다" },
      { type: "p", text: "저는 매일 수십 번 같은 흐름을 눌렀기 때문에 저장 버튼이 어디 있는지 보지 않고도 알았습니다. 처음 쓰는 사람에게는 보이지 않는 버튼이 곧 없는 버튼이었습니다." },
      { type: "figure", art: { hue: 28, shape: "keypad" }, title: "키패드가 올라온 입력 화면", caption: "고치기 전: 키패드가 저장 버튼을 덮습니다." },
      { type: "list", items: ["저장 버튼을 키패드 위로 붙였습니다.", "금액을 넣지 않으면 버튼이 흐려지고 이유를 적습니다.", "저장한 내역이 목록 맨 위에 잠깐 칠해지게 했습니다."] },
      { type: "p", text: "고친 버전을 다시 건넸을 때 같은 질문은 나오지 않았습니다. 다음 화에서는 한 달 동안 쓴 뒤에 남은 내역을 보며 무엇을 지웠는지 이야기하겠습니다." },
    ],
  },
  {
    slug: "small-app-2",
    title: "작은 앱 만들기 2화: 화면 세 개로 시작하기",
    summary: "기능 목록을 지우고 화면 세 개만 남겼습니다. 홈, 입력, 달력. 나머지는 모두 나중으로 미뤘습니다.",
    category: "개발",
    date: "2026-11-02",
    views: 3910,
    likes: 98,
    series: { id: "small-app", part: 2 },
    blocks: [
      { type: "p", text: "처음 적은 기능 목록은 스물세 줄이었습니다. 예산, 통계, 반복 지출, 영수증 사진, 가족 공유까지. 하나씩 지우다 보니 매일 여는 이유는 세 가지뿐이었습니다." },
      { type: "h2", text: "매일 여는 이유만 남기기" },
      { type: "list", items: ["오늘 얼마 썼는지 보기", "방금 쓴 돈 적기", "지난 날짜를 눌러 무엇을 샀는지 찾기"] },
      { type: "p", text: "세 화면이 서로 같은 내역을 보도록 데이터는 한 곳에만 두었습니다. 화면마다 합계를 따로 계산하던 첫 시안에서는 홈과 달력의 숫자가 달랐습니다." },
      { type: "code", code: "const total = entries\n  .filter((entry) => entry.date === today)\n  .reduce((sum, entry) => sum + entry.amount, 0);" },
      { type: "quote", text: "같은 숫자는 한 곳에서 계산한다." },
      { type: "p", text: "이 원칙 하나로 화면이 늘어도 합계가 어긋나지 않았습니다. 다음 화에서는 이 세 화면을 처음 쓴 사람이 어디서 멈췄는지 적겠습니다." },
    ],
  },
  {
    slug: "small-app-1",
    title: "작은 앱 만들기 1화: 왜 또 가계부인가",
    summary: "세상에 가계부 앱은 이미 많습니다. 그래도 하나를 직접 만들기로 한 이유를 적었습니다.",
    category: "개발",
    date: "2026-10-19",
    views: 5230,
    likes: 141,
    series: { id: "small-app", part: 1 },
    blocks: [
      { type: "p", text: "가계부 앱을 다섯 개쯤 깔았다가 모두 지웠습니다. 은행 연결을 요구하거나, 첫 화면에 그래프가 너무 많거나, 광고가 입력 버튼 옆에 붙어 있었습니다." },
      { type: "h2", text: "내가 원하는 것은 적기뿐이었다" },
      { type: "p", text: "필요한 것은 쓰자마자 적고, 오늘과 이번 달 합계를 보는 것뿐이었습니다. 그래서 그것만 하는 앱을 만들고, 만드는 과정을 이 연재로 남기기로 했습니다." },
      { type: "quote", text: "기능을 더하는 일보다 빼는 일이 더 오래 걸렸다." },
      { type: "p", text: "다음 화에서는 기능 목록을 화면 세 개로 줄인 과정을 적겠습니다." },
    ],
  },
  {
    slug: "empty-state",
    title: "빈 화면에 무엇을 둘까",
    summary: "목록이 비어 있을 때 보여 주는 화면은 처음 온 사람이 가장 먼저 보는 화면입니다.",
    category: "디자인",
    date: "2026-11-09",
    views: 6120,
    likes: 187,
    featured: true,
    blocks: [
      { type: "p", text: "빈 화면은 만드는 사람이 가장 늦게 보는 화면입니다. 개발하는 동안에는 늘 가짜 데이터가 채워져 있기 때문입니다." },
      { type: "h2", text: "설명보다 첫 행동" },
      { type: "p", text: "빈 화면에 긴 설명을 두면 읽지 않고 지나갑니다. 대신 지금 할 수 있는 행동 하나를 버튼으로 두었더니 첫 내역을 적는 사람이 늘었습니다." },
      { type: "figure", art: { hue: 260, shape: "compare" }, title: "빈 목록 화면 두 가지", caption: "왼쪽은 설명 세 줄, 오른쪽은 버튼 하나." },
      { type: "quote", text: "빈 화면은 설명서가 아니라 입구다." },
      { type: "p", text: "검색 결과가 없을 때는 조금 다릅니다. 이때는 무엇을 찾았는지 다시 보여 주고, 철자를 고치거나 범위를 넓히는 길을 함께 둡니다." },
    ],
  },
  {
    slug: "type-scale",
    title: "글자 크기를 다섯 개로 줄인 이유",
    summary: "화면마다 조금씩 다른 글자 크기가 열한 개였습니다. 다섯 개로 줄이자 화면이 조용해졌습니다.",
    category: "디자인",
    date: "2026-10-26",
    views: 2870,
    likes: 76,
    blocks: [
      { type: "p", text: "앱의 글자 크기를 모두 세어 보니 열한 가지였습니다. 13px과 14px, 15px이 비슷한 자리에서 번갈아 쓰이고 있었습니다." },
      { type: "h2", text: "역할로 이름 붙이기" },
      { type: "list", items: ["제목", "본문", "보조 설명", "숫자 강조", "버튼"] },
      { type: "p", text: "크기 대신 역할로 이름을 붙이자 새 화면을 만들 때 고민이 줄었습니다. 이 글자가 제목인지 설명인지만 정하면 크기는 따라왔습니다." },
      { type: "code", code: ":root {\n  --text-title: 20px;\n  --text-body: 15px;\n  --text-caption: 13px;\n}" },
    ],
  },
  {
    slug: "walk-notes",
    title: "점심 산책에서 고친 버그",
    summary: "책상 앞에서 세 시간 못 찾던 버그를 산책 이십 분 만에 찾은 날의 기록.",
    category: "기록",
    date: "2026-11-12",
    views: 3340,
    likes: 120,
    featured: true,
    blocks: [
      { type: "p", text: "달력에서 날짜를 고르면 가끔 하루 전 내역이 보였습니다. 세 시간 동안 코드를 읽었지만 찾지 못했습니다." },
      { type: "p", text: "점심을 먹고 회사 뒤 공원을 걸었습니다. 두 번째 벤치를 지날 때쯤 시간대가 떠올랐습니다. 날짜를 UTC로 바꾸는 줄이 하나 있었습니다." },
      { type: "quote", text: "답은 늘 화면 밖에서 왔다." },
      { type: "h2", text: "그 뒤로 바꾼 습관" },
      { type: "list", items: ["한 시간 넘게 막히면 일단 걷는다.", "걸으면서 문제를 한 문장으로 말해 본다.", "돌아와서 그 문장부터 적는다."] },
    ],
  },
  {
    slug: "reading-list",
    title: "11월에 읽은 것들",
    summary: "이번 달에 읽고 밑줄 그은 글 네 편과 책 한 권.",
    category: "기록",
    date: "2026-11-05",
    views: 1980,
    likes: 54,
    blocks: [
      { type: "p", text: "이번 달에는 화면 설계보다 글쓰기에 관한 글을 많이 읽었습니다. 블로그를 다시 시작하면서 생긴 관심입니다." },
      { type: "list", items: ["짧은 문장이 긴 문장보다 어려운 이유", "제목에 숫자를 넣을 때 생각할 것", "독자가 멈추는 곳을 찾는 법", "초고를 버리는 용기"] },
      { type: "quote", text: "읽히는 글은 쓰는 사람이 먼저 여러 번 읽은 글이다." },
      { type: "p", text: "다음 달에는 이 블로그의 글을 다시 읽으며 고칠 문장을 모아 보려고 합니다." },
    ],
  },
  {
    slug: "dark-mode",
    title: "어두운 화면에서 사라진 구분선",
    summary: "어두운 모드를 켜자 카드 사이 경계가 보이지 않았습니다. 색을 하나씩 다시 정한 과정.",
    category: "디자인",
    date: "2026-10-12",
    views: 4410,
    likes: 109,
    blocks: [
      { type: "p", text: "밝은 화면에서 쓰던 회색 선을 그대로 어둡게 뒤집었더니 카드와 배경이 한 덩어리가 됐습니다." },
      { type: "h2", text: "선 대신 면으로" },
      { type: "p", text: "어두운 화면에서는 선보다 면의 밝기 차이가 더 잘 보였습니다. 배경, 카드, 떠 있는 창을 세 단계 밝기로 나눴습니다." },
      { type: "figure", art: { hue: 220, shape: "layers" }, title: "세 단계 밝기", caption: "배경보다 카드가, 카드보다 떠 있는 창이 한 단계씩 밝습니다." },
      { type: "p", text: "그 뒤로 새 색을 정할 때는 밝은 화면과 어두운 화면을 나란히 놓고 한 번에 고릅니다." },
    ],
  },
];

export function postBySlug(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}

export function seriesById(id: string): Series | undefined {
  return series.find((entry) => entry.id === id);
}

export function seriesPosts(id: string): Post[] {
  return posts.filter((post) => post.series?.id === id).sort((a, b) => (a.series?.part ?? 0) - (b.series?.part ?? 0));
}

// 한국어 본문을 분당 500자로 읽는다고 보고 계산한다.
export function readingMinutes(post: Post): number {
  const characters = post.blocks.reduce((sum, block) => {
    if (block.type === "list") return sum + block.items.join("").length;
    if (block.type === "figure") return sum + block.caption.length;
    if (block.type === "code") return sum + block.code.length;
    return sum + block.text.length;
  }, 0);
  return Math.max(1, Math.round(characters / 500));
}

// 날짜는 홈, 검색, 글 화면 어디서나 이 한 형식(2026.11.16)으로 쓴다.
// 화면마다 "2026년 11월 16일"과 고정폭 "2026.11.16"이 섞여 같은 값이 다른 것처럼 보였다.
export function formatDate(date: string): string {
  return date.replaceAll("-", ".");
}
