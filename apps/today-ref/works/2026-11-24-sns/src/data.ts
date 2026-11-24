// 서버 없이 쓰는 가짜 데이터. 시각은 앱을 연 순간에서 몇 분 전인지로 적는다.

export interface User {
  id: string;
  name: string;
  handle: string;
  bio: string;
  // 아바타와 배너의 색상(0~360). 사진 대신 이름 첫 글자와 이 색을 쓴다.
  hue: number;
  // 이 화면에 나오지 않는 사람까지 합친 수. 내가 팔로우하면 화면에서 1을 더한다.
  baseFollowers: number;
  followingCount: number;
  joined: string;
  pinnedPostId?: string;
}

export interface Photo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Post {
  id: string;
  authorId: string;
  text: string;
  minutesAgo: number;
  photos: Photo[];
  replyToId?: string;
  // 이 화면에 불러오지 않은 반응까지 합친 수. 내가 누른 것은 따로 더한다.
  baseLikes: number;
  baseReposts: number;
  baseReplies: number;
  baseSaves: number;
}

export interface Repost {
  userId: string;
  postId: string;
  minutesAgo: number;
}

export const meId = "me";

export const users: User[] = [
  { id: meId, name: "윤하늘", handle: "haneul", bio: "아침엔 커피, 저녁엔 산책. 사진은 잘 못 찍지만 자주 찍습니다.", hue: 168, baseFollowers: 214, followingCount: 3, joined: "2025년 3월" },
  { id: "doyun", name: "김도윤", handle: "doyun.k", bio: "필름과 디지털 사이. 주말마다 바다나 산.", hue: 205, baseFollowers: 8421, followingCount: 312, joined: "2024년 7월", pinnedPostId: "p-fjord" },
  { id: "jiwoo", name: "서지우", handle: "jiwoo_reads", bio: "한 달에 네 권. 동네 독서모임 '책장 넘기는 밤' 운영 중.", hue: 32, baseFollowers: 3120, followingCount: 188, joined: "2024년 11월", pinnedPostId: "p-bookclub" },
  { id: "minho", name: "박민호", handle: "minho.dev", bio: "프런트엔드 개발자. 작은 도구를 자주 만듭니다.", hue: 262, baseFollowers: 1904, followingCount: 421, joined: "2025년 1월" },
  { id: "yuna", name: "최유나", handle: "yuna.bakes", bio: "집에서 굽는 빵과 과자. 실패작도 올립니다.", hue: 350, baseFollowers: 12840, followingCount: 96, joined: "2024년 5월" },
  { id: "woojin", name: "정우진", handle: "woojin.run", bio: "새벽 5킬로. 기록보다 꾸준함.", hue: 120, baseFollowers: 655, followingCount: 230, joined: "2025년 6월" },
  { id: "narae", name: "이나래", handle: "narae", bio: "카페 탐방 기록. 원두는 산미 있는 쪽.", hue: 20, baseFollowers: 2290, followingCount: 340, joined: "2024년 9월" },
  { id: "serin", name: "오세린", handle: "serin.live", bio: "공연 보러 다니는 사람. 앞줄보다 가운데.", hue: 290, baseFollowers: 980, followingCount: 501, joined: "2025년 2월" },
  { id: "taeo", name: "강태오", handle: "taeo", bio: "퍼그 '두부'의 보호자.", hue: 45, baseFollowers: 25300, followingCount: 41, joined: "2024년 4월" },
  { id: "maps", name: "동네지도", handle: "neighbor.map", bio: "걸어서 가는 동네 가게와 골목을 모읍니다.", hue: 190, baseFollowers: 15400, followingCount: 12, joined: "2024년 3월" },
];

// 처음에 팔로우하고 있는 사람.
export const initialFollowing = ["doyun", "jiwoo", "minho"];

const photo = (name: string, alt: string, width: number, height: number): Photo => ({
  src: `${import.meta.env.BASE_URL}photos/${name}.jpg`,
  alt,
  width,
  height,
});

export const posts: Post[] = [
  {
    id: "p-snow",
    authorId: "doyun",
    text: "올해 첫눈 예보 떴네요. 내일 아침 6시에 남산 올라갈 분? 해 뜨기 전 파란 시간에 눈 내리는 걸 찍어 보고 싶어요. #첫눈 #사진",
    minutesAgo: 6,
    photos: [],
    baseLikes: 41,
    baseReposts: 6,
    baseReplies: 0,
    baseSaves: 2,
  },
  {
    id: "p-pourover",
    authorId: "narae",
    text: "연남동에 새로 연 작은 카페. 핸드드립을 저울까지 보여 주면서 내려 주는데, 에티오피아 원두가 꽃향이 진했어요. 창가 자리는 세 개뿐이라 오전에 가세요.",
    minutesAgo: 18,
    photos: [photo("pourover", "카운터에서 드리퍼로 커피를 내리는 모습", 1200, 900), photo("latte", "나무 탁자 위 라테 한 잔과 영수증", 1200, 1200)],
    baseLikes: 132,
    baseReposts: 14,
    baseReplies: 0,
    baseSaves: 40,
  },
  {
    id: "p-tool",
    authorId: "minho",
    text: "주말에 만든 것: 탭을 30개 넘게 열면 제일 오래 안 본 탭부터 조용히 접어 주는 확장. 지우지 않고 접기만 해요. 써 보고 싶은 분 답글 주세요.",
    minutesAgo: 47,
    photos: [],
    baseLikes: 88,
    baseReposts: 9,
    baseReplies: 0,
    baseSaves: 21,
  },
  {
    id: "p-bookclub",
    authorId: "jiwoo",
    text: "12월 '책장 넘기는 밤'은 두 권을 같이 읽어요. 하나는 짧은 소설집, 하나는 산책에 관한 에세이. 마지막 목요일 저녁 7시, 망원동 2층 책방. 자리 열 개 남았습니다. #독서모임 #책",
    minutesAgo: 75,
    photos: [photo("tea-book", "침대 위에 펼친 책과 찻잔", 1200, 900)],
    baseLikes: 204,
    baseReposts: 37,
    baseReplies: 0,
    baseSaves: 66,
  },
  {
    id: "p-strawberry",
    authorId: "yuna",
    text: "딸기 철이 왔으니 생크림 케이크 연습 3일째. 오늘은 시트가 안 꺼졌어요! 비결은 달걀을 중탕으로 데워서 거품 낸 것. #베이킹",
    minutesAgo: 130,
    photos: [photo("strawberries", "상자에 가득 담긴 딸기", 1200, 900)],
    baseLikes: 1380,
    baseReposts: 112,
    baseReplies: 0,
    baseSaves: 402,
  },
  {
    id: "p-run",
    authorId: "woojin",
    text: "영하 2도 새벽 5킬로 완료. 손가락이 제일 춥네요. 장갑 추천 받습니다. #러닝",
    minutesAgo: 190,
    photos: [photo("field", "마른 풀밭에 운동화를 신은 두 발", 1200, 900)],
    baseLikes: 57,
    baseReposts: 2,
    baseReplies: 0,
    baseSaves: 1,
  },
  {
    id: "p-fjord",
    authorId: "doyun",
    text: "작년 가을 노르웨이에서 찍은 것 중 아직도 제일 좋아하는 세 장. 절벽 끝까지 네 시간 걸어 올라갔는데 바람 때문에 삼각대를 못 폈어요. #사진",
    minutesAgo: 60 * 26,
    photos: [
      photo("fjord", "절벽 아래로 길게 이어진 파란 피오르", 1200, 800),
      photo("valley", "침엽수 숲 너머 화강암 절벽이 선 계곡", 1200, 800),
      photo("canal", "운하를 따라 늘어선 오래된 집들과 작은 배", 1200, 900),
    ],
    baseLikes: 4210,
    baseReposts: 530,
    baseReplies: 0,
    baseSaves: 1210,
  },
  {
    id: "p-dubu",
    authorId: "taeo",
    text: "두부가 담요를 망토처럼 두르고 산책 나가겠다고 버팁니다. 결국 이대로 나갔어요.",
    minutesAgo: 60 * 5,
    photos: [photo("pug", "체크무늬 담요를 두르고 숲길에 앉은 퍼그", 900, 1200)],
    baseLikes: 9620,
    baseReposts: 1430,
    baseReplies: 0,
    baseSaves: 880,
  },
  {
    id: "p-alley",
    authorId: "maps",
    text: "이번 주 골목: 성수동 연무장길 뒤편. 오래된 공업사 사이에 꽃집, 샐러드 가게, 중고 레코드점이 한 줄로 붙어 있어요. 걸어서 한 바퀴 20분. #주말산책",
    minutesAgo: 60 * 8,
    photos: [photo("salad", "나무 도마 위 그릇에 담긴 샐러드", 1200, 900), photo("blossom", "파란 하늘 아래 분홍 꽃송이", 900, 1200)],
    baseLikes: 2105,
    baseReposts: 388,
    baseReplies: 0,
    baseSaves: 970,
  },
  {
    id: "p-concert",
    authorId: "serin",
    text: "어제 공연 앙코르 세 곡 연속이었어요. 마지막 곡에서 다 같이 손 들었을 때 조명이 객석 쪽으로 돌아온 순간이 계속 생각나요.",
    minutesAgo: 60 * 20,
    photos: [photo("concert", "무대 조명 아래 손을 든 관객들", 1200, 800)],
    baseLikes: 310,
    baseReposts: 22,
    baseReplies: 0,
    baseSaves: 15,
  },
  {
    id: "p-me-walk",
    authorId: meId,
    text: "퇴근길에 한 정거장 먼저 내려서 걸었더니 하루가 조금 길어진 기분. 내일도 해 봐야지.",
    minutesAgo: 60 * 30,
    photos: [],
    baseLikes: 23,
    baseReposts: 1,
    baseReplies: 0,
    baseSaves: 0,
  },
  {
    id: "p-me-book",
    authorId: meId,
    text: "지우 님 추천으로 읽기 시작한 산책 에세이, 첫 장부터 밑줄이 많아요. #책",
    minutesAgo: 60 * 52,
    photos: [photo("book", "나무 탁자 위에 펼쳐진 책", 1200, 800)],
    baseLikes: 31,
    baseReposts: 0,
    baseReplies: 0,
    baseSaves: 3,
  },
  // 답글. 같은 작성자가 이어 쓴 글은 상세에서 세로선으로 잇는다.
  { id: "r-fjord-1", authorId: "doyun", replyToId: "p-fjord", text: "장비: 35mm 단렌즈 하나. 무거운 건 다 숙소에 두고 갔어요.", minutesAgo: 60 * 26 - 2, photos: [], baseLikes: 380, baseReposts: 4, baseReplies: 0, baseSaves: 30 },
  { id: "r-fjord-2", authorId: "doyun", replyToId: "r-fjord-1", text: "그리고 세 번째 사진은 사실 노르웨이가 아니라 돌아오는 길에 들른 브뤼허예요.", minutesAgo: 60 * 26 - 3, photos: [], baseLikes: 290, baseReposts: 2, baseReplies: 0, baseSaves: 4 },
  { id: "r-fjord-3", authorId: "woojin", replyToId: "p-fjord", text: "네 시간 오르막이면 사진보다 다리가 먼저 기억날 것 같네요.", minutesAgo: 60 * 25, photos: [], baseLikes: 44, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-fjord-4", authorId: "narae", replyToId: "p-fjord", text: "두 번째 계곡 사진 배경화면으로 써도 될까요?", minutesAgo: 60 * 22, photos: [], baseLikes: 12, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-fjord-5", authorId: "doyun", replyToId: "r-fjord-4", text: "그럼요. 원본 크기로 보내 드릴게요.", minutesAgo: 60 * 21, photos: [], baseLikes: 9, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-pour-1", authorId: meId, replyToId: "p-pourover", text: "창가 자리 세 개라는 정보 감사해요. 토요일 아침에 가 볼게요.", minutesAgo: 12, photos: [], baseLikes: 2, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-pour-2", authorId: "narae", replyToId: "r-pour-1", text: "토요일은 10시 오픈이에요!", minutesAgo: 9, photos: [], baseLikes: 1, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-book-1", authorId: meId, replyToId: "p-bookclub", text: "산책 에세이 읽는 중이라 반갑네요. 신청은 어디로 하면 될까요?", minutesAgo: 70, photos: [], baseLikes: 5, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-book-2", authorId: "jiwoo", replyToId: "r-book-1", text: "이 글에 답글로 이름만 남겨 주시면 돼요. 하늘 님 자리 하나 맡아 둘게요.", minutesAgo: 64, photos: [], baseLikes: 3, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-straw-1", authorId: "jiwoo", replyToId: "p-strawberry", text: "중탕 팁 저장해요. 매번 시트가 주저앉았거든요.", minutesAgo: 120, photos: [], baseLikes: 40, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "r-run-1", authorId: "minho", replyToId: "p-run", text: "터치 되는 얇은 장갑 안에 울 장갑 한 겹 더 끼면 따뜻해요.", minutesAgo: 170, photos: [], baseLikes: 8, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
];

// 팔로우한 사람이 다시 올린 글. 팔로잉 피드에 '○○ 님이 재게시함' 줄과 함께 나온다.
export const reposts: Repost[] = [
  { userId: "jiwoo", postId: "p-alley", minutesAgo: 35 },
  { userId: "minho", postId: "p-dubu", minutesAgo: 95 },
];

// 열어 둔 동안 조금씩 들어오는 새 글. 피드 위 '새 글' 알약을 눌러야 목록에 붙는다.
export const incomingPosts: Omit<Post, "minutesAgo">[] = [
  { id: "n-snow-1", authorId: "maps", text: "첫눈 오면 가기 좋은 동네 산책길 다섯 곳을 모아 뒀어요. 언덕이 적고 문 연 카페가 이어지는 길만 골랐습니다. #첫눈 #주말산책", photos: [], baseLikes: 12, baseReposts: 3, baseReplies: 0, baseSaves: 5 },
  { id: "n-bake-1", authorId: "yuna", text: "케이크 남은 딸기로 잼 끓이는 중. 설탕은 딸기 무게의 절반만.", photos: [photo("strawberries", "상자에 가득 담긴 딸기", 1200, 900)], baseLikes: 30, baseReposts: 1, baseReplies: 0, baseSaves: 4 },
  { id: "n-dev-1", authorId: "minho", text: "탭 접기 확장, 써 보겠다는 분이 생각보다 많아서 내일 저녁에 링크 올릴게요.", photos: [], baseLikes: 6, baseReposts: 0, baseReplies: 0, baseSaves: 0 },
  { id: "n-photo-1", authorId: "doyun", text: "남산 같이 가실 분 세 분 모였어요. 6시 남산서울타워 매표소 앞.", photos: [], baseLikes: 9, baseReposts: 1, baseReplies: 0, baseSaves: 0 },
];

export interface Trend {
  tag: string;
  posts: number;
}

export const trends: Trend[] = [
  { tag: "첫눈", posts: 18400 },
  { tag: "독서모임", posts: 3210 },
  { tag: "베이킹", posts: 2980 },
  { tag: "러닝", posts: 2400 },
  { tag: "주말산책", posts: 1720 },
  { tag: "사진", posts: 1530 },
];

// 홈 피드 탭. 추천과 팔로잉 뒤에 내가 고정한 주제 피드가 같은 줄에 붙는다.
export const pinnedFeeds = [
  { id: "photos", label: "사진", tag: "사진" },
  { id: "books", label: "책", tag: "책" },
] as const;
