// 서버 없이 쓰는 가상의 SNS "말결" 데이터. 시간은 지금을 기준으로 몇 분 전인지로 둔다.

export type User = {
  id: string;
  handle: string;
  name: string;
  avatarTone: number;
  verified: boolean;
  bio: string;
  followerCount: number;
};

export type Scene = "dusk-river" | "film-sea" | "lighthouse" | "night-street" | "bookshelf";

export type PollOption = { id: string; label: string; votes: number };

export type Poll = {
  options: PollOption[];
  votedOptionId: string | null;
  remaining: string;
};

export type Post = {
  id: string;
  authorId: string;
  minutesAgo: number;
  text: string;
  scenes: Scene[];
  poll: Poll | null;
  communityId: string | null;
  // 답글이면 원글 id, 피드에 올라가는 글이면 null
  parentId: string | null;
  likeCount: number;
  liked: boolean;
  repostCount: number;
  reposted: boolean;
  shareCount: number;
};

export type Community = {
  id: string;
  name: string;
  memberCount: number;
  activeCount: number;
  memberPreviewIds: string[];
};

export type ActivityKind = "reply" | "like" | "follow" | "mention" | "repost";

export type Activity = {
  id: string;
  kind: ActivityKind;
  userId: string;
  minutesAgo: number;
  // 답글과 멘션은 상대가 쓴 글, 좋아요와 리포스트는 내 글의 앞부분
  text: string | null;
};

export const ME_ID = "me";

const userList: User[] = [
  {
    id: ME_ID,
    handle: "jiwoo.log",
    name: "한지우",
    avatarTone: 0,
    verified: false,
    bio: "퇴근하고 쓰는 짧은 기록. 필름 카메라와 달리기, 가끔 책.",
    followerCount: 1284,
  },
  { id: "haneul", handle: "haneul.kim", name: "김하늘", avatarTone: 1, verified: false, bio: "", followerCount: 842 },
  {
    id: "seoyeon",
    handle: "seoyeon.film",
    name: "박서연",
    avatarTone: 2,
    verified: true,
    bio: "필름으로 찍는 서울",
    followerCount: 32400,
  },
  {
    id: "junho",
    handle: "junho.dev",
    name: "이준호",
    avatarTone: 3,
    verified: true,
    bio: "프론트엔드 개발자",
    followerCount: 15800,
  },
  { id: "doyun", handle: "mapo.runner", name: "김도윤", avatarTone: 4, verified: false, bio: "", followerCount: 2310 },
  {
    id: "minji",
    handle: "minji.reads",
    name: "서민지",
    avatarTone: 5,
    verified: false,
    bio: "책 읽는 밤 운영진",
    followerCount: 5120,
  },
  {
    id: "minjae",
    handle: "gangneung.sea",
    name: "정민재",
    avatarTone: 6,
    verified: false,
    bio: "강릉에 삽니다",
    followerCount: 9870,
  },
  {
    id: "taeho",
    handle: "taeho_daily",
    name: "윤태호",
    avatarTone: 7,
    verified: true,
    bio: "회사원 일기",
    followerCount: 48200,
  },
  {
    id: "yuna",
    handle: "yuna.draws",
    name: "오유나",
    avatarTone: 1,
    verified: false,
    bio: "그림 그리는 직장인",
    followerCount: 21300,
  },
  {
    id: "hyunwoo",
    handle: "cafe.hunter",
    name: "장현우",
    avatarTone: 3,
    verified: false,
    bio: "커피 마시러 다니는 기록",
    followerCount: 7650,
  },
  { id: "soyoung", handle: "soyoung.cooks", name: "최소영", avatarTone: 6, verified: false, bio: "", followerCount: 3340 },
];

export const users: Record<string, User> = Object.fromEntries(userList.map((user) => [user.id, user]));

export const me = users[ME_ID];

export const suggestedUserIds = userList
  .filter((user) => user.id !== ME_ID)
  .sort((a, b) => b.followerCount - a.followerCount)
  .map((user) => user.id);

export const communities: Record<string, Community> = {
  "book-night": {
    id: "book-night",
    name: "책 읽는 밤",
    memberCount: 126000,
    activeCount: 1754,
    memberPreviewIds: ["minji", "taeho", "haneul"],
  },
};

type SeedFields = Pick<Post, "id" | "authorId" | "minutesAgo" | "text"> & Partial<Post>;

function seed(fields: SeedFields): Post {
  return {
    scenes: [],
    poll: null,
    communityId: null,
    parentId: null,
    likeCount: 0,
    liked: false,
    repostCount: 0,
    reposted: false,
    shareCount: 0,
    ...fields,
  };
}

const HOUR = 60;
const DAY = 24 * HOUR;

const feedPosts: Post[] = [
  seed({
    id: "p1",
    authorId: "haneul",
    minutesAgo: 3,
    text: "퇴근길 지하철에서 졸다가 한 정거장 지나쳤는데, 그 덕에 처음 내려 본 동네에서 붕어빵 샀다. 오늘은 이걸로 됐다",
    likeCount: 81,
    repostCount: 2,
    shareCount: 1,
  }),
  seed({
    id: "p2",
    authorId: "seoyeon",
    minutesAgo: 14,
    text: "어제 한강 노을. 한 롤 다 찍고 겨우 한 장 건졌다",
    scenes: ["dusk-river"],
    likeCount: 1204,
    liked: true,
    repostCount: 31,
    shareCount: 58,
  }),
  seed({
    id: "p3",
    authorId: "junho",
    minutesAgo: 38,
    text: "점심 메뉴 정하는 데 20분 쓰는 팀 저희만 그런가요. 오늘은 투표로 정합니다",
    poll: {
      options: [
        { id: "kimchi", label: "김치찌개", votes: 121 },
        { id: "pho", label: "쌀국수", votes: 105 },
        { id: "lunchbox", label: "편의점 도시락", votes: 31 },
      ],
      votedOptionId: null,
      remaining: "23시간 남음",
    },
    likeCount: 103,
    repostCount: 4,
    shareCount: 2,
  }),
  seed({
    id: "p4",
    authorId: "doyun",
    minutesAgo: 52,
    text: "오늘 아침 7km. 망원에서 출발해서 성산대교 찍고 돌아왔는데 바람이 확실히 차가워졌다. 이제 장갑 챙길 때",
    likeCount: 56,
    repostCount: 1,
  }),
  seed({
    id: "p5",
    authorId: "minji",
    minutesAgo: 70,
    communityId: "book-night",
    text: "한 달에 네 권 읽기로 했는데 오늘 기준 한 권 반 읽었습니다.\n남은 2주 동안 얇은 책 위주로 고르면 반칙인가요",
    likeCount: 245,
    repostCount: 12,
    shareCount: 5,
  }),
  seed({
    id: "p6",
    authorId: "minjae",
    minutesAgo: 2 * HOUR + 10,
    text: "평일 오전 안목해변. 사람이 거의 없어서 파도 소리만 들렸다",
    scenes: ["film-sea", "lighthouse"],
    likeCount: 688,
    repostCount: 15,
    shareCount: 9,
  }),
  seed({
    id: "p7",
    authorId: "taeho",
    minutesAgo: 3 * HOUR + 5,
    text: "회의 끝에 '그럼 다음 주에 다시 얘기해요'가 나오면 이번 주는 끝난 거다",
    likeCount: 3920,
    repostCount: 407,
    reposted: true,
    shareCount: 87,
  }),
  seed({
    id: "p8",
    authorId: "yuna",
    minutesAgo: 5 * HOUR + 20,
    text: "퇴근길 풍경을 조금씩 그려 보는 중. 가로등 색을 몇 번이나 바꿨는지 모르겠다",
    scenes: ["night-street"],
    likeCount: 2310,
    repostCount: 88,
    shareCount: 40,
  }),
  seed({
    id: "p9",
    authorId: "hyunwoo",
    minutesAgo: DAY + 3 * HOUR,
    text: "연남동 골목 끝에 있는 작은 카페 다녀왔어요. 메뉴는 드립 커피 세 가지가 전부고 의자도 여섯 개뿐인데, 사장님이 원두 설명을 한 잔씩 해 주셔서 생각보다 오래 앉아 있었어요.\n\n조용한 곳 찾는 분들께 추천합니다. 위치는 답글에 남겨 둘게요.",
    likeCount: 412,
    repostCount: 8,
    shareCount: 31,
  }),
  seed({
    id: "p10",
    authorId: "soyoung",
    minutesAgo: DAY + 6 * HOUR,
    text: "무 한 개 사서 깍두기 담그고, 남은 걸로 뭇국 끓이고, 그래도 남아서 무생채까지 했다. 무는 생각보다 크다",
    likeCount: 167,
    repostCount: 3,
    shareCount: 2,
  }),
  seed({
    id: "p11",
    authorId: "minji",
    minutesAgo: 2 * DAY + 2 * HOUR,
    communityId: "book-night",
    text: "이번 주 함께 읽는 책은 『이름 없는 계절』입니다. 3장까지 읽고 밑줄 그은 문장 하나씩 남겨 주세요",
    scenes: ["bookshelf"],
    likeCount: 980,
    repostCount: 22,
    shareCount: 17,
  }),
  seed({
    id: "p12",
    authorId: "taeho",
    minutesAgo: 3 * DAY,
    communityId: "book-night",
    text: "출퇴근 지하철에서만 읽는데 1년에 30권쯤 되더라고요. 다들 언제 읽으세요?",
    likeCount: 532,
    repostCount: 6,
    shareCount: 3,
  }),
  seed({
    id: "m1",
    authorId: ME_ID,
    minutesAgo: 3 * DAY + 4 * HOUR,
    text: "필름 현상 맡긴 지 2주째. 결과를 기다리는 시간도 사진의 일부라고 스스로 달래는 중",
    likeCount: 38,
  }),
  seed({
    id: "m2",
    authorId: ME_ID,
    minutesAgo: 6 * DAY,
    text: "러닝 앱 기록이 통째로 날아갔다. 그래도 뛴 건 다리가 기억하겠지",
    likeCount: 24,
  }),
];

// 답글 수는 따로 저장하지 않고 이 목록에서 센다. 화면의 답글 수와 상세에서 열리는 목록이 항상 같다.
type ReplySeed = [id: string, parentId: string, authorId: string, minutesAgo: number, text: string, likeCount: number];

const replySeeds: ReplySeed[] = [
  ["r1", "p1", "soyoung", 2, "팥이에요 슈크림이에요? 이게 제일 중요함", 12],
  ["r2", "p1", "doyun", 1, "한 정거장 지나친 게 이득이었네", 5],
  ["r3", "p1", "haneul", 1, "@soyoung.cooks 당연히 팥이죠", 3],

  ["r4", "p2", "yuna", 9, "색감이 그림 같아요. 어떤 필름 쓰셨어요?", 96],
  ["r5", "p2", "seoyeon", 8, "@yuna.draws 포트라 400이요. 노출은 반 스톱 올렸어요", 64],
  ["r6", "p2", "haneul", 11, "저도 어제 거기 있었는데 이렇게는 안 보였어요", 41],
  ["r7", "p2", "minjae", 6, "다리 기둥 사이로 빛 떨어지는 거 너무 좋다", 27],
  ["r8", "p2", "taeho", 4, "한 롤에 한 장이면 성공률 높은 편 아닌가요", 18],
  ["r9", "p2", "hyunwoo", 2, "이 사진 보고 오늘 퇴근길에 한강 들렀다 갑니다", 9],

  ["r10", "p3", "haneul", 3, "김치찌개 아니면 회사 안 갑니다", 52],
  ["r11", "p3", "soyoung", 15, "쌀국수 집 웨이팅 생각하면 김치찌개가 현실적이죠. 근데 오늘 비 와서 국물은 다 붐빌 듯", 81],
  ["r12", "p3", "taeho", 22, "편의점 도시락 고른 31명은 진짜 바쁜 사람들", 214],
  ["r13", "p3", "doyun", 30, "투표 끝나기 전에 점심시간이 끝날 것 같은데요", 37],
  ["r14", "p3", "junho", 10, "현재 김치찌개가 앞서고 있습니다. 쌀국수 파 분발하세요", 29],

  ["r15", "p4", "haneul", 40, "장갑 이야기 나오면 진짜 겨울이죠", 8],
  ["r16", "p4", "minjae", 35, "강릉은 벌써 패딩 입고 뜁니다", 6],

  ["r17", "p5", "taeho", 40, "반칙 아닙니다. 시집도 한 권이에요", 188],
  ["r18", "p5", "hyunwoo", 55, "얇은 책 추천 받습니다", 23],
  ["r19", "p5", "minji", 50, "@cafe.hunter 『작은 것들의 목록』 두 시간이면 읽어요", 41],
  ["r20", "p5", "yuna", 30, "저는 아직 한 권도 못 끝냈어요…", 15],

  ["r21", "p6", "seoyeon", 100, "두 번째 사진 등대 색이 정말 예쁘네요", 33],
  ["r22", "p6", "soyoung", 90, "평일 오전 바다는 반칙이죠", 12],
  ["r23", "p6", "doyun", 60, "커피거리도 들르셨어요?", 4],

  ["r24", "p7", "minjae", 2 * HOUR, "그리고 다음 주에도 같은 말을 한다", 640],
  ["r25", "p7", "junho", 2 * HOUR + 30, "회의록에 '추후 논의'라고 적히는 순간이죠", 312],
  ["r26", "p7", "haneul", 2 * HOUR + 20, "금요일 오후 4시 회의는 그래서 있는 거 아닐까요", 205],
  ["r27", "p7", "soyoung", 100, "저희 팀은 '일단 각자 생각해 보고 오세요'예요", 96],
  ["r28", "p7", "hyunwoo", 70, "출근하기 전에 봤으면 안 됐다", 41],
  ["r29", "p7", "yuna", 30, "캡처해서 팀 채팅방에 올렸습니다", 22],

  ["r30", "p8", ME_ID, 3 * HOUR + 20, "가로등 색은 지금이 제일 좋아요", 8],
  ["r31", "p8", "seoyeon", 4 * HOUR + 40, "창문 불빛 하나하나 다 다른 색이네요", 54],
  ["r32", "p8", "taeho", 4 * HOUR + 10, "이거 우리 동네 골목이랑 똑같아요", 19],
  ["r33", "p8", "yuna", 4 * HOUR, "@seoyeon.film 집마다 저녁 메뉴가 다르다고 생각하고 칠했어요", 77],

  ["r34", "p9", "hyunwoo", DAY + 2 * HOUR + 50, "위치는 연남동 시장 뒤쪽 골목, 파란 문 있는 곳이에요. 간판이 작아서 지나치기 쉬워요", 58],
  ["r35", "p9", "haneul", DAY + HOUR, "의자 여섯 개면 주말엔 못 앉겠네요", 14],
  ["r36", "p9", "soyoung", DAY, "원두 설명 해 주는 곳 너무 좋아요. 저장해 둡니다", 9],

  ["r37", "p10", "haneul", DAY + 4 * HOUR, "무는 진짜 사 보면 생각보다 큼", 11],
  ["r38", "p10", "minji", DAY + 3 * HOUR, "다음은 무조림 차례인가요", 7],

  ["r39", "p11", "taeho", 2 * DAY, "'계절은 이름을 붙이는 순간 지나간다' 이 문장이요", 120],
  ["r40", "p11", "haneul", DAY + 22 * HOUR, "3장 마지막 쪽 편지 부분에서 한참 멈춰 있었어요", 64],
  ["r41", "p11", "yuna", DAY + 20 * HOUR, "'아무도 기억하지 않는 날에도 해는 졌다' 밑줄 쳤습니다", 88],
  ["r42", "p11", "hyunwoo", DAY + 16 * HOUR, "아직 2장인데 내일까지 따라가겠습니다", 12],
  ["r43", "p11", "doyun", DAY + 12 * HOUR, "출근길에 읽다가 내릴 역 놓칠 뻔했어요", 31],
  ["r44", "p11", "minji", DAY + 10 * HOUR, "다들 좋은 문장 고마워요. 다음 주는 4장부터 6장까지 읽어요", 45],

  ["r45", "p12", "minji", 2 * DAY + 22 * HOUR, "저는 자기 전 30분이요. 대신 금방 잠듭니다", 76],
  ["r46", "p12", "haneul", 2 * DAY + 19 * HOUR, "점심 먹고 남는 20분이요", 22],
  ["r47", "p12", "yuna", 2 * DAY + 15 * HOUR, "주말 아침 카페에서 몰아서 읽어요", 18],
  ["r48", "p12", "soyoung", 2 * DAY + 10 * HOUR, "요리하면서 오디오북 들어요. 이것도 독서죠?", 34],

  ["r49", "m1", "seoyeon", 40, "현상 기다리는 그 2주가 제일 설레요", 12],
  ["r50", "m1", "doyun", 2 * DAY, "결과 나오면 꼭 올려 주세요", 5],

  ["r51", "m2", "doyun", 5 * DAY + 12 * HOUR, "앱 기록은 날아가도 기록은 남는다", 7],
  ["r52", "m2", "minji", 5 * DAY, "저도 작년에 똑같은 일 있었어요. 백업 꼭 하세요", 4],
  ["r53", "m2", "hyunwoo", 4 * DAY, "다리가 기억하는 기록 최고다", 3],
];

const replies: Post[] = replySeeds.map(([id, parentId, authorId, minutesAgo, text, likeCount]) =>
  seed({ id, parentId, authorId, minutesAgo, text, likeCount }),
);

export const initialPosts: Post[] = [...feedPosts, ...replies];

export const initialFollowingIds = ["seoyeon", "yuna", "doyun"];

export const activities: Activity[] = [
  { id: "a1", kind: "reply", userId: "seoyeon", minutesAgo: 40, text: "현상 기다리는 그 2주가 제일 설레요" },
  { id: "a2", kind: "like", userId: "taeho", minutesAgo: HOUR, text: "필름 현상 맡긴 지 2주째. 결과를 기다리는 시간도…" },
  { id: "a3", kind: "follow", userId: "yuna", minutesAgo: 3 * HOUR, text: null },
  {
    id: "a4",
    kind: "mention",
    userId: "doyun",
    minutesAgo: 5 * HOUR,
    text: "@jiwoo.log 이번 토요일 아침에 망원에서 같이 뛰어요. 7시 반 출발",
  },
  { id: "a5", kind: "like", userId: "minji", minutesAgo: DAY + HOUR, text: "러닝 앱 기록이 통째로 날아갔다. 그래도 뛴 건…" },
  { id: "a6", kind: "repost", userId: "hyunwoo", minutesAgo: DAY + 4 * HOUR, text: "러닝 앱 기록이 통째로 날아갔다. 그래도 뛴 건…" },
  { id: "a7", kind: "follow", userId: "soyoung", minutesAgo: 2 * DAY, text: null },
  { id: "a8", kind: "like", userId: "haneul", minutesAgo: 3 * DAY, text: "필름 현상 맡긴 지 2주째. 결과를 기다리는 시간도…" },
];
