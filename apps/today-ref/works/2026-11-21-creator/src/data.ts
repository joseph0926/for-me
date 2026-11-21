// 서버 없이 쓰는 가상의 크리에이터, 글, 댓글, 일정. 사람과 제품 이름은 모두 지어낸 것이다.

export type TierId = "follow" | "member" | "close";
export type Visibility = "public" | "member" | "close";
export type Motif = "sun" | "waves" | "stage" | "bowl" | "sketch" | "window" | "night";

export type Tier = {
  id: TierId;
  name: string;
  monthlyPrice: number;
  benefits: string[];
};

export type Creator = {
  id: string;
  name: string;
  // 크리에이터 홈의 칩 "From ○○"에 쓰는 짧은 부름말
  callName: string;
  role: string;
  bio: string;
  hue: number;
  motif: Motif;
  followers: number;
  anniversary: { label: string; daysLeft: number };
  prices: { member: number; close: number };
};

export type FanUser = { id: string; name: string; tone: number };

export type Author = { kind: "creator"; creatorId: string } | { kind: "fan"; fanId: string };

export type Post = {
  id: string;
  // 글이 올라간 크리에이터 공간. 팬 글도 그 크리에이터 공간에 속한다.
  creatorId: string;
  author: Author;
  createdAt: number;
  body: string;
  scene: Motif | null;
  visibility: Visibility;
  views: number;
  likes: number;
};

export type Comment = {
  id: string;
  postId: string;
  author: Author;
  createdAt: number;
  body: string;
  likes: number;
};

export type Notice = { id: string; creatorId: string; title: string; postedOn: string };

export type EventKind = "live" | "release" | "show";

export type ScheduleEvent = {
  id: string;
  creatorId: string;
  date: string;
  time: string;
  kind: EventKind;
  title: string;
};

export type NotificationKind = "creator-comment" | "new-post" | "live" | "schedule";

export type Notification = {
  id: string;
  kind: NotificationKind;
  creatorId: string;
  text: string;
  createdAt: number;
  target: { name: "post"; postId: string } | { name: "creator"; creatorId: string } | { name: "live"; creatorId: string };
};

export const ME: FanUser = { id: "me", name: "새벽세시", tone: 5 };

export const BOOT_TIME = Date.now();
const minutesAgo = (minutes: number) => BOOT_TIME - minutes * 60_000;

// 지금 라이브 중인 방송. 한 번에 한 크리에이터만 방송한다고 둔다.
export const liveNow = {
  creatorId: "lateSummer",
  title: "신곡 2절 첫 합주",
  startedAt: minutesAgo(7),
  viewers: 3_204,
};

export const TIER_ORDER: TierId[] = ["follow", "member", "close"];

export function tiersFor(creator: Creator): Tier[] {
  return [
    {
      id: "follow",
      name: "팔로우",
      monthlyPrice: 0,
      benefits: ["전체 공개 글과 공지", "팬 글 쓰기와 댓글", "라이브 알림"],
    },
    {
      id: "member",
      name: "멤버",
      monthlyPrice: creator.prices.member,
      benefits: ["멤버 전용 글", "라이브 다시 보기", "멤버 배지"],
    },
    {
      id: "close",
      name: "가까운 멤버",
      monthlyPrice: creator.prices.close,
      benefits: ["멤버 혜택 전부", "가까운 멤버 전용 글", "작업 노트와 미공개 데모", "공연 선예매"],
    },
  ];
}

export const creators: Creator[] = [
  {
    id: "yoonseul",
    name: "하윤슬",
    callName: "윤슬",
    role: "싱어송라이터",
    bio: "밤에 쓰고 아침에 고치는 노래들",
    hue: 22,
    motif: "sun",
    followers: 182_400,
    anniversary: { label: "데뷔 3주년", daysLeft: 2 },
    prices: { member: 4900, close: 9900 },
  },
  {
    id: "lateSummer",
    name: "늦은여름",
    callName: "늦은여름",
    role: "4인조 밴드",
    bio: "합주실에서 바로 올리는 소식",
    hue: 198,
    motif: "stage",
    followers: 96_120,
    anniversary: { label: "첫 정규 발매", daysLeft: 12 },
    prices: { member: 3900, close: 8900 },
  },
  {
    id: "doyo",
    name: "도요",
    callName: "도요",
    role: "요리 크리에이터",
    bio: "혼자 먹어도 제대로, 한 그릇 요리",
    hue: 96,
    motif: "bowl",
    followers: 341_800,
    anniversary: { label: "채널 5주년", daysLeft: 20 },
    prices: { member: 2900, close: 6900 },
  },
  {
    id: "maru",
    name: "마루",
    callName: "마루",
    role: "일러스트레이터",
    bio: "창가에서 그리는 작은 동네",
    hue: 262,
    motif: "window",
    followers: 58_730,
    anniversary: { label: "첫 화집 출간", daysLeft: 34 },
    prices: { member: 3500, close: 7500 },
  },
];

export const fans: FanUser[] = [
  ME,
  { id: "f1", name: "오렌지빛", tone: 0 },
  { id: "f2", name: "합주실지박령", tone: 1 },
  { id: "f3", name: "한그릇러", tone: 2 },
  { id: "f4", name: "윤슬바라기", tone: 3 },
  { id: "f5", name: "초록창문", tone: 4 },
  { id: "f6", name: "베이스라인", tone: 6 },
  { id: "f7", name: "주말요리사", tone: 7 },
];

const byCreator = (creatorId: string): Author => ({ kind: "creator", creatorId });
const byFan = (fanId: string): Author => ({ kind: "fan", fanId });

export const initialPosts: Post[] = [
  {
    id: "p1",
    creatorId: "yoonseul",
    author: byCreator("yoonseul"),
    createdAt: minutesAgo(18),
    body: "오늘 아침 녹음 끝! 3주년 날에 들려줄 노래 마지막 줄을 방금 바꿨어요. 원래 가사가 너무 슬퍼서… 어떤 버전일지는 그날 확인해 주세요 🌅",
    scene: "sun",
    visibility: "public",
    views: 12_840,
    likes: 3_120,
  },
  {
    id: "p2",
    creatorId: "yoonseul",
    author: byCreator("yoonseul"),
    createdAt: minutesAgo(95),
    body: "멤버들한테만 먼저: 3주년 노래 가사 초안 사진이에요. 지운 줄까지 그대로 올려요.",
    scene: "sketch",
    visibility: "member",
    views: 4_210,
    likes: 1_480,
  },
  {
    id: "p3",
    creatorId: "yoonseul",
    author: byCreator("yoonseul"),
    createdAt: minutesAgo(60 * 26),
    body: "가까운 멤버 작업 노트 #7. 피아노 한 대로 만든 데모 1분. 코러스 위치를 두 가지로 녹음했는데 어느 쪽이 좋은지 댓글로 알려 주세요.",
    scene: "night",
    visibility: "close",
    views: 860,
    likes: 412,
  },
  {
    id: "p4",
    creatorId: "lateSummer",
    author: byCreator("lateSummer"),
    createdAt: minutesAgo(7),
    body: "지금 합주실에서 라이브 켰어요! 신곡 2절 처음 맞춰 봅니다. 틀려도 웃어 주기 🎸",
    scene: "stage",
    visibility: "public",
    views: 6_020,
    likes: 1_904,
  },
  {
    id: "p5",
    creatorId: "lateSummer",
    author: byCreator("lateSummer"),
    createdAt: minutesAgo(60 * 5),
    body: "정규 1집 트랙리스트 손글씨 버전. 멤버 분들께 먼저 보여 드려요. 7번 트랙 제목은 아직 비밀!",
    scene: "sketch",
    visibility: "member",
    views: 2_300,
    likes: 980,
  },
  {
    id: "p6",
    creatorId: "doyo",
    author: byCreator("doyo"),
    createdAt: minutesAgo(48),
    body: "냉장고 털이 들기름 비빔국수. 간장 1, 들기름 1.5, 설탕 0.5 비율만 기억하세요. 오이는 꼭 얇게!",
    scene: "bowl",
    visibility: "public",
    views: 28_400,
    likes: 5_630,
  },
  {
    id: "p7",
    creatorId: "doyo",
    author: byCreator("doyo"),
    createdAt: minutesAgo(60 * 30),
    body: "다음 주 영상 미리보기: 한 냄비 카레 세 가지 버전. 멤버 분들 투표로 첫 편을 정할게요.",
    scene: "waves",
    visibility: "member",
    views: 3_900,
    likes: 1_120,
  },
  {
    id: "p8",
    creatorId: "maru",
    author: byCreator("maru"),
    createdAt: minutesAgo(60 * 3),
    body: "비 오는 날의 골목 시리즈 세 번째 장. 창문 불빛 색을 열 번쯤 바꿨어요.",
    scene: "window",
    visibility: "public",
    views: 7_420,
    likes: 2_260,
  },
  {
    id: "fp1",
    creatorId: "yoonseul",
    author: byFan("f4"),
    createdAt: minutesAgo(130),
    body: "#to_윤슬 언니 노래 덕분에 오늘 출근길이 덜 추웠어요. 3주년 진심으로 축하해요!",
    scene: null,
    visibility: "public",
    views: 940,
    likes: 73,
  },
  {
    id: "fp2",
    creatorId: "yoonseul",
    author: byFan("f1"),
    createdAt: minutesAgo(60 * 9),
    body: "#to_윤슬 지난 공연에서 앵콜로 불러 준 노래 음원으로 나오면 좋겠어요…",
    scene: null,
    visibility: "public",
    views: 610,
    likes: 41,
  },
  {
    id: "fp3",
    creatorId: "lateSummer",
    author: byFan("f2"),
    createdAt: minutesAgo(60 * 2),
    body: "#to_늦은여름 드럼 소리가 점점 좋아져요. 오늘 라이브도 달려갑니다!",
    scene: null,
    visibility: "public",
    views: 420,
    likes: 28,
  },
  {
    id: "fp4",
    creatorId: "doyo",
    author: byFan("f7"),
    createdAt: minutesAgo(60 * 4),
    body: "#to_도요 비빔국수 비율 그대로 했더니 가족들이 두 그릇씩 먹었어요 👏",
    scene: "bowl",
    visibility: "public",
    views: 1_210,
    likes: 96,
  },
];

export const initialComments: Comment[] = [
  { id: "c1", postId: "p1", author: byFan("f4"), createdAt: minutesAgo(15), body: "슬픈 버전도 언젠가 들려주세요 🥲", likes: 210 },
  { id: "c2", postId: "p1", author: byFan("f1"), createdAt: minutesAgo(12), body: "3주년 당일 알람 맞춰 놨어요!", likes: 98 },
  { id: "c3", postId: "p1", author: byCreator("yoonseul"), createdAt: minutesAgo(9), body: "슬픈 버전은 멤버 공간에 몰래 올려 둘게요 🤫", likes: 1_204 },
  { id: "c4", postId: "p4", author: byFan("f2"), createdAt: minutesAgo(5), body: "들어가는 중!!", likes: 32 },
  { id: "c5", postId: "p6", author: byFan("f3"), createdAt: minutesAgo(40), body: "들기름 없으면 참기름도 되나요?", likes: 54 },
  { id: "c6", postId: "p6", author: byCreator("doyo"), createdAt: minutesAgo(31), body: "참기름이면 양을 반으로 줄이세요. 향이 훨씬 세요!", likes: 640 },
  { id: "c7", postId: "fp1", author: byCreator("yoonseul"), createdAt: minutesAgo(70), body: "출근길 같이 걸은 기분이에요. 고마워요 ☀️", likes: 1_856 },
  { id: "c8", postId: "fp1", author: byFan("f1"), createdAt: minutesAgo(60), body: "답글 받으셨네요 부러워요", likes: 12 },
  { id: "c9", postId: "fp4", author: byCreator("doyo"), createdAt: minutesAgo(60 * 3), body: "두 그릇이면 성공입니다 🍜", likes: 402 },
  { id: "c10", postId: "fp3", author: byFan("f6"), createdAt: minutesAgo(80), body: "저도요!", likes: 4 },
  { id: "c11", postId: "p8", author: byFan("f5"), createdAt: minutesAgo(150), body: "마지막 노란 불빛이 제일 좋아요", likes: 61 },
];

export const notices: Notice[] = [
  { id: "n1", creatorId: "yoonseul", title: "3주년 기념 온라인 라이브 시청 안내", postedOn: "2026.11.20" },
  { id: "n2", creatorId: "yoonseul", title: "겨울 소극장 공연 멤버 선예매 일정", postedOn: "2026.11.14" },
  { id: "n3", creatorId: "lateSummer", title: "정규 1집 발매 기념 쇼케이스 응모", postedOn: "2026.11.18" },
  { id: "n4", creatorId: "doyo", title: "구독자 레시피 공모전 결과 발표", postedOn: "2026.11.10" },
  { id: "n5", creatorId: "maru", title: "첫 화집 예약 판매 안내", postedOn: "2026.11.16" },
];

export const scheduleEvents: ScheduleEvent[] = [
  { id: "e1", creatorId: "yoonseul", date: "2026-11-23", time: "20:00", kind: "live", title: "3주년 기념 온라인 라이브" },
  { id: "e2", creatorId: "yoonseul", date: "2026-11-23", time: "18:00", kind: "release", title: "디지털 싱글 '첫 줄' 발매" },
  { id: "e3", creatorId: "yoonseul", date: "2026-12-14", time: "19:30", kind: "show", title: "겨울 소극장 공연" },
  { id: "e4", creatorId: "lateSummer", date: "2026-12-03", time: "18:00", kind: "release", title: "정규 1집 발매" },
  { id: "e5", creatorId: "lateSummer", date: "2026-12-06", time: "19:00", kind: "show", title: "발매 쇼케이스" },
  { id: "e6", creatorId: "doyo", date: "2026-11-26", time: "21:00", kind: "live", title: "같이 만드는 야식 라이브" },
  { id: "e7", creatorId: "maru", date: "2026-12-01", time: "12:00", kind: "release", title: "화집 예약 판매 시작" },
];

export const initialNotifications: Notification[] = [
  {
    id: "nt1",
    kind: "live",
    creatorId: "lateSummer",
    text: "늦은여름 님이 라이브를 시작했어요. 신곡 2절 첫 합주",
    createdAt: minutesAgo(7),
    target: { name: "live", creatorId: "lateSummer" },
  },
  {
    id: "nt2",
    kind: "new-post",
    creatorId: "yoonseul",
    text: "하윤슬 님이 새 글을 올렸어요. 오늘 아침 녹음 끝!",
    createdAt: minutesAgo(18),
    target: { name: "post", postId: "p1" },
  },
  {
    id: "nt3",
    kind: "schedule",
    creatorId: "yoonseul",
    text: "모레 18:00 디지털 싱글 '첫 줄' 발매",
    createdAt: minutesAgo(60 * 6),
    target: { name: "creator", creatorId: "yoonseul" },
  },
  {
    id: "nt4",
    kind: "creator-comment",
    creatorId: "doyo",
    text: "도요 님이 한그릇러 님의 질문에 답했어요",
    createdAt: minutesAgo(31),
    target: { name: "post", postId: "p6" },
  },
];

// 라이브 채팅에 차례로 흘려 보낼 팬 메시지
export const liveChatPool: { fanId: string; text: string }[] = [
  { fanId: "f2", text: "드럼 소리 너무 좋아요" },
  { fanId: "f6", text: "베이스 소리 더 키워 주세요!!" },
  { fanId: "f1", text: "2절 가사 벌써 외웠어요" },
  { fanId: "f5", text: "퇴근하고 바로 들어왔어요" },
  { fanId: "f3", text: "합주실 조명 예뻐요" },
  { fanId: "f7", text: "한 번 더! 한 번 더!" },
  { fanId: "f4", text: "늦은여름 화이팅 💙" },
  { fanId: "f2", text: "브릿지에서 소름 돋았어요" },
];

export const liveCreatorLines = ["2절 다시 갈게요!", "채팅 다 보고 있어요 ㅎㅎ", "베이스 볼륨 올렸어요", "다음 곡은 신청곡으로 할게요"];

// 내가 팬 글을 올리면 크리에이터가 남기는 답글. 서버가 없으므로 정해 둔 문장을 쓴다.
export const creatorReplies: Record<string, string> = {
  yoonseul: "글 읽고 한참 웃었어요. 오늘도 고마워요 ☀️",
  lateSummer: "멤버 넷이 같이 읽었어요! 라이브에서 만나요 🎸",
  doyo: "다음 레시피도 꼭 같이 해요 🍳",
  maru: "이 글 보면서 오늘 그림 하나 더 그릴게요 ✏️",
};
