// 가상의 숙소 예약 서비스 "머물곳"의 서울 숙소 데이터다. 지도 좌표는 StayMap의 1000 x 1000 그림 좌표계를 쓴다.

export const BRAND = "머물곳";

export type StayType = "호텔" | "모텔" | "게스트하우스" | "한옥스테이" | "레지던스";
export const STAY_TYPES: StayType[] = ["호텔", "모텔", "게스트하우스", "한옥스테이", "레지던스"];

export type AmenityId =
  | "wifi"
  | "parking"
  | "kitchen"
  | "washer"
  | "bathtub"
  | "breakfast"
  | "workspace"
  | "selfCheckin"
  | "pet";

export const AMENITIES: { id: AmenityId; label: string }[] = [
  { id: "parking", label: "무료 주차" },
  { id: "breakfast", label: "조식 제공" },
  { id: "kitchen", label: "주방" },
  { id: "washer", label: "세탁기" },
  { id: "bathtub", label: "욕조" },
  { id: "workspace", label: "업무 공간" },
  { id: "selfCheckin", label: "셀프 체크인" },
  { id: "pet", label: "반려동물 동반" },
  { id: "wifi", label: "와이파이" },
];

export function amenityLabel(id: AmenityId) {
  return AMENITIES.find((amenity) => amenity.id === id)?.label ?? id;
}

export type Area = "망원" | "연남" | "서촌" | "익선" | "을지로" | "한남" | "성수" | "잠실";

export interface MapPoint {
  x: number;
  y: number;
}

export const AREAS: { name: Area; district: string; center: MapPoint }[] = [
  { name: "성수", district: "성동구", center: { x: 712, y: 492 } },
  { name: "연남", district: "마포구", center: { x: 300, y: 352 } },
  { name: "을지로", district: "중구", center: { x: 548, y: 392 } },
  { name: "한남", district: "용산구", center: { x: 528, y: 566 } },
  { name: "서촌", district: "종로구", center: { x: 406, y: 244 } },
  { name: "익선", district: "종로구", center: { x: 592, y: 268 } },
  { name: "망원", district: "마포구", center: { x: 216, y: 478 } },
  { name: "잠실", district: "송파구", center: { x: 800, y: 736 } },
];

// 같은 동네 숙소가 지도에서 겹치지 않도록 동네 중심에서 벌려 놓는 자리
const AREA_SLOTS: MapPoint[] = [
  { x: -54, y: -24 },
  { x: 52, y: -30 },
  { x: -44, y: 30 },
  { x: 56, y: 26 },
];

export type PhotoScene = "bedroom" | "twin" | "lounge" | "hanok" | "bath" | "facade" | "view";
export type PhotoTone = "oak" | "linen" | "concrete" | "hanok" | "sage" | "clay" | "night";

export interface Room {
  id: string;
  name: string;
  bed: string;
  sizeM2: number;
  capacity: number;
  price: number;
}

export type Cancellation =
  | { kind: "free"; daysBefore: number }
  | { kind: "partial"; daysBefore: number }
  | { kind: "none" };

export interface Stay {
  id: string;
  name: string;
  area: Area;
  type: StayType;
  rooms: Room[];
  cleaningFee: number;
  rating: number;
  reviewCount: number;
  amenities: AmenityId[];
  cancellation: Cancellation;
  tone: PhotoTone;
  photos: PhotoScene[];
  access: string;
  checkIn: string;
  checkOut: string;
  description: string;
  pos: MapPoint;
}

type StayInput = Omit<Stay, "id" | "pos" | "photos" | "rooms" | "checkIn" | "checkOut"> & {
  rooms: Omit<Room, "id">[];
  checkIn?: string;
  checkOut?: string;
};

const SCENES_BY_TYPE: Record<StayType, PhotoScene[]> = {
  호텔: ["bedroom", "view", "bath", "lounge", "facade"],
  모텔: ["bedroom", "bath", "twin", "lounge", "facade"],
  게스트하우스: ["bedroom", "lounge", "twin", "bath", "facade"],
  한옥스테이: ["hanok", "bedroom", "bath", "lounge", "facade"],
  레지던스: ["lounge", "bedroom", "view", "bath", "facade"],
};

const INPUTS: StayInput[] = [
  {
    name: "성수 웨어하우스 스테이",
    area: "성수",
    type: "레지던스",
    rooms: [
      { name: "스튜디오", bed: "퀸 침대 1개", sizeM2: 33, capacity: 2, price: 128000 },
      { name: "로프트 투룸", bed: "퀸 침대 1개, 싱글 침대 2개", sizeM2: 58, capacity: 5, price: 189000 },
    ],
    cleaningFee: 20000,
    rating: 4.87,
    reviewCount: 612,
    amenities: ["kitchen", "washer", "wifi", "workspace", "selfCheckin", "parking"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "concrete",
    access: "성수역 도보 4분",
    description:
      "1970년대 구두 공장을 고쳐 만든 층고 높은 레지던스입니다. 큰 철제 창으로 오후 내내 볕이 들고, 1층에는 투숙객 전용 라운지와 자전거 보관소가 있습니다.",
  },
  {
    name: "연남 숲길하우스",
    area: "연남",
    type: "게스트하우스",
    rooms: [
      { name: "더블룸", bed: "더블 침대 1개", sizeM2: 16, capacity: 2, price: 72000 },
      { name: "3인실", bed: "더블 침대 1개, 싱글 침대 1개", sizeM2: 21, capacity: 3, price: 99000 },
    ],
    cleaningFee: 0,
    rating: 4.89,
    reviewCount: 534,
    amenities: ["wifi", "kitchen", "washer", "selfCheckin"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "sage",
    access: "홍대입구역 3번 출구 도보 5분",
    description:
      "경의선숲길이 창밖으로 내려다보이는 4층 주택의 게스트하우스입니다. 아침에는 공용 주방에서 원두와 토스트를 자유롭게 드실 수 있습니다.",
  },
  {
    name: "호텔 을지 로프트",
    area: "을지로",
    type: "호텔",
    rooms: [
      { name: "로프트 더블", bed: "퀸 침대 1개", sizeM2: 24, capacity: 2, price: 108500 },
      { name: "로프트 스위트", bed: "킹 침대 1개, 소파 베드 1개", sizeM2: 38, capacity: 3, price: 152000 },
    ],
    cleaningFee: 0,
    rating: 4.74,
    reviewCount: 1206,
    amenities: ["wifi", "workspace", "parking"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "concrete",
    access: "을지로3가역 도보 2분",
    description:
      "인쇄소 골목 사이에 있는 객실 42개의 작은 호텔입니다. 모든 객실에 복층 구조와 업무용 책상이 있어 출장 숙박이 많습니다.",
  },
  {
    name: "서촌 누하재",
    area: "서촌",
    type: "한옥스테이",
    rooms: [{ name: "한옥 독채", bed: "요 이불 4채", sizeM2: 66, capacity: 4, price: 268000 }],
    cleaningFee: 30000,
    rating: 4.96,
    reviewCount: 128,
    amenities: ["wifi", "kitchen", "bathtub", "workspace", "selfCheckin"],
    cancellation: { kind: "partial", daysBefore: 7 },
    tone: "hanok",
    access: "경복궁역 도보 8분",
    checkIn: "16:00",
    description:
      "누하동 골목 안쪽, 1936년에 지어진 ㄷ자 한옥을 통째로 쓰는 독채입니다. 마당을 향한 대청마루와 편백 욕조가 있고 인왕산이 지붕 너머로 보입니다.",
  },
  {
    name: "호텔 서울숲 그로브",
    area: "성수",
    type: "호텔",
    rooms: [
      { name: "스탠다드 더블", bed: "퀸 침대 1개", sizeM2: 26, capacity: 2, price: 142500 },
      { name: "포레스트뷰 디럭스", bed: "킹 침대 1개, 싱글 침대 1개", sizeM2: 34, capacity: 3, price: 184000 },
    ],
    cleaningFee: 0,
    rating: 4.79,
    reviewCount: 1976,
    amenities: ["wifi", "breakfast", "parking", "workspace", "bathtub"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "sage",
    access: "서울숲역 도보 3분",
    description:
      "서울숲 정문 맞은편의 호텔로, 디럭스 객실은 숲 쪽으로 창이 납니다. 조식은 2층 식당에서 7시부터 10시까지 제공합니다.",
  },
  {
    name: "테라스 한남",
    area: "한남",
    type: "레지던스",
    rooms: [{ name: "테라스 스위트", bed: "킹 침대 1개, 퀸 침대 1개", sizeM2: 72, capacity: 4, price: 235000 }],
    cleaningFee: 35000,
    rating: 4.93,
    reviewCount: 164,
    amenities: ["kitchen", "washer", "wifi", "bathtub", "workspace", "parking", "pet"],
    cancellation: { kind: "partial", daysBefore: 7 },
    tone: "oak",
    access: "한강진역 도보 6분",
    description:
      "남향 테라스에서 한강과 남산이 함께 보이는 스위트 한 채입니다. 소형 반려견 동반이 가능하며 지하 주차장 1대를 무료로 드립니다.",
  },
  {
    name: "망원살이",
    area: "망원",
    type: "게스트하우스",
    rooms: [
      { name: "2인실", bed: "더블 침대 1개", sizeM2: 14, capacity: 2, price: 58000 },
      { name: "4인 패밀리룸", bed: "더블 침대 1개, 이층 침대 1개", sizeM2: 24, capacity: 4, price: 96500 },
    ],
    cleaningFee: 0,
    rating: 4.71,
    reviewCount: 312,
    amenities: ["wifi", "washer", "kitchen", "selfCheckin"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "linen",
    access: "망원역 도보 6분",
    description:
      "망원시장과 한강공원 사이 조용한 주택가의 게스트하우스입니다. 옥상에서 해 질 무렵 성산대교 쪽 노을이 잘 보입니다.",
  },
  {
    name: "익선 한옥 달빛채",
    area: "익선",
    type: "한옥스테이",
    rooms: [
      { name: "사랑채 2인", bed: "요 이불 2채", sizeM2: 26, capacity: 2, price: 159000 },
      { name: "한옥 독채", bed: "요 이불 4채", sizeM2: 48, capacity: 4, price: 212500 },
    ],
    cleaningFee: 20000,
    rating: 4.88,
    reviewCount: 341,
    amenities: ["wifi", "bathtub", "selfCheckin"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "hanok",
    access: "종로3가역 4번 출구 도보 3분",
    description:
      "익선동 한옥 골목 한가운데 있는 두 채짜리 한옥입니다. 밤에는 골목 상점이 닫혀 조용하고, 마당 조명이 은은하게 켜집니다.",
  },
  {
    name: "호텔 레이크 잠실",
    area: "잠실",
    type: "호텔",
    rooms: [
      { name: "스탠다드 더블", bed: "퀸 침대 1개", sizeM2: 27, capacity: 2, price: 154000 },
      { name: "레이크뷰 트윈", bed: "싱글 침대 2개, 소파 베드 1개", sizeM2: 32, capacity: 3, price: 196500 },
      { name: "패밀리 스위트", bed: "킹 침대 1개, 싱글 침대 2개", sizeM2: 54, capacity: 4, price: 268000 },
    ],
    cleaningFee: 0,
    rating: 4.82,
    reviewCount: 3412,
    amenities: ["wifi", "breakfast", "parking", "workspace", "bathtub"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "clay",
    access: "잠실역 도보 7분",
    description:
      "석촌호수 동쪽에 있는 객실 300개 규모의 호텔입니다. 레이크뷰 객실은 18층 이상에 있고 피트니스와 실내 수영장을 이용할 수 있습니다.",
  },
  {
    name: "모텔 하루 망원",
    area: "망원",
    type: "모텔",
    rooms: [
      { name: "일반실", bed: "퀸 침대 1개", sizeM2: 20, capacity: 2, price: 54900 },
      { name: "스파룸", bed: "킹 침대 1개", sizeM2: 28, capacity: 2, price: 79000 },
    ],
    cleaningFee: 0,
    rating: 4.42,
    reviewCount: 1880,
    amenities: ["wifi", "parking", "bathtub", "selfCheckin"],
    cancellation: { kind: "partial", daysBefore: 1 },
    tone: "night",
    access: "망원역 도보 4분",
    checkIn: "17:00",
    checkOut: "12:00",
    description: "2025년에 전 객실을 고친 무인 운영 모텔입니다. 스파룸에는 2인 월풀 욕조가 있고 주차는 건물 뒤편 기계식 주차장을 씁니다.",
  },
  {
    name: "호텔 오브제 연남",
    area: "연남",
    type: "호텔",
    rooms: [
      { name: "스탠다드", bed: "퀸 침대 1개", sizeM2: 22, capacity: 2, price: 129000 },
      { name: "코너 스위트", bed: "킹 침대 1개, 소파 베드 1개", sizeM2: 36, capacity: 3, price: 186500 },
    ],
    cleaningFee: 0,
    rating: 4.76,
    reviewCount: 842,
    amenities: ["wifi", "workspace", "breakfast", "parking"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "clay",
    access: "홍대입구역 도보 7분",
    description: "국내 가구 작가들의 작품으로 객실을 꾸민 부티크 호텔입니다. 1층 카페에서 투숙객 조식을 제공합니다.",
  },
  {
    name: "스테이 인쇄소",
    area: "을지로",
    type: "레지던스",
    rooms: [
      { name: "스튜디오", bed: "퀸 침대 1개", sizeM2: 29, capacity: 2, price: 94000 },
      { name: "투룸", bed: "퀸 침대 1개, 싱글 침대 2개", sizeM2: 52, capacity: 4, price: 141500 },
    ],
    cleaningFee: 15000,
    rating: 4.81,
    reviewCount: 377,
    amenities: ["kitchen", "washer", "wifi", "workspace", "selfCheckin"],
    cancellation: { kind: "partial", daysBefore: 5 },
    tone: "concrete",
    access: "을지로4가역 도보 3분",
    description: "옛 인쇄 공장 건물의 3층과 4층을 레지던스로 바꿨습니다. 노출 콘크리트 벽과 원목 가구가 어우러지고 세탁실을 따로 갖췄습니다.",
  },
  {
    name: "체부동 한옥 온새",
    area: "서촌",
    type: "한옥스테이",
    rooms: [
      { name: "안채 2인", bed: "요 이불 2채", sizeM2: 30, capacity: 2, price: 176500 },
      { name: "한옥 독채", bed: "요 이불 4채", sizeM2: 52, capacity: 4, price: 238000 },
    ],
    cleaningFee: 25000,
    rating: 4.91,
    reviewCount: 87,
    amenities: ["wifi", "bathtub", "breakfast"],
    cancellation: { kind: "free", daysBefore: 7 },
    tone: "hanok",
    access: "경복궁역 2번 출구 도보 4분",
    description: "체부동 시장 뒤편의 작은 한옥입니다. 아침에는 집주인이 차린 한식 상차림을 툇마루에서 드실 수 있습니다.",
  },
  {
    name: "호텔 종로 앙상블",
    area: "익선",
    type: "호텔",
    rooms: [
      { name: "스탠다드 더블", bed: "더블 침대 1개", sizeM2: 19, capacity: 2, price: 99000 },
      { name: "패밀리 트리플", bed: "더블 침대 1개, 싱글 침대 1개", sizeM2: 27, capacity: 3, price: 133000 },
    ],
    cleaningFee: 0,
    rating: 4.62,
    reviewCount: 2315,
    amenities: ["wifi", "breakfast", "parking", "workspace"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "linen",
    access: "종로3가역 도보 1분",
    description: "지하철역과 바로 이어진 비즈니스호텔입니다. 창덕궁과 인사동까지 걸어서 10분 안에 닿습니다.",
  },
  {
    name: "성수 연무장 게스트하우스",
    area: "성수",
    type: "게스트하우스",
    rooms: [
      { name: "더블룸", bed: "더블 침대 1개", sizeM2: 15, capacity: 2, price: 76500 },
      { name: "4인 패밀리룸", bed: "퀸 침대 1개, 이층 침대 1개", sizeM2: 26, capacity: 4, price: 118000 },
    ],
    cleaningFee: 0,
    rating: 4.68,
    reviewCount: 359,
    amenities: ["wifi", "washer", "kitchen", "selfCheckin"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "linen",
    access: "성수역 3번 출구 도보 5분",
    description: "연무장길 카페 거리 한복판에 새로 연 게스트하우스입니다. 모든 객실에 개별 욕실이 있습니다.",
  },
  {
    name: "호텔 이태원 언덕",
    area: "한남",
    type: "호텔",
    rooms: [
      { name: "스탠다드", bed: "퀸 침대 1개", sizeM2: 23, capacity: 2, price: 126500 },
      { name: "디럭스 킹", bed: "킹 침대 1개, 소파 베드 1개", sizeM2: 31, capacity: 3, price: 172000 },
    ],
    cleaningFee: 0,
    rating: 4.65,
    reviewCount: 1388,
    amenities: ["wifi", "breakfast", "workspace"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "clay",
    access: "이태원역 도보 5분",
    description: "이태원 언덕 위에 있어 높은 층에서는 남산타워가 정면으로 보입니다. 루프톱 라운지는 밤 11시까지 엽니다.",
  },
  {
    name: "서촌 필운 레지던스",
    area: "서촌",
    type: "레지던스",
    rooms: [{ name: "스튜디오", bed: "퀸 침대 1개", sizeM2: 31, capacity: 2, price: 117000 }],
    cleaningFee: 15000,
    rating: 4.73,
    reviewCount: 156,
    amenities: ["kitchen", "washer", "wifi", "workspace", "selfCheckin"],
    cancellation: { kind: "partial", daysBefore: 5 },
    tone: "oak",
    access: "경복궁역 도보 6분",
    description: "필운대로 언덕 쪽 조용한 골목의 원룸형 레지던스입니다. 한 달 살기 손님이 많아 주방 도구를 넉넉히 갖췄습니다.",
  },
  {
    name: "모텔 시티 을지로",
    area: "을지로",
    type: "모텔",
    rooms: [
      { name: "일반실", bed: "퀸 침대 1개", sizeM2: 19, capacity: 2, price: 65000 },
      { name: "특실", bed: "킹 침대 1개", sizeM2: 26, capacity: 2, price: 82900 },
    ],
    cleaningFee: 0,
    rating: 4.39,
    reviewCount: 1542,
    amenities: ["wifi", "parking", "bathtub", "selfCheckin"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "night",
    access: "을지로입구역 도보 4분",
    checkIn: "18:00",
    checkOut: "12:00",
    description: "명동과 을지로 사이에 있는 모텔입니다. 특실에는 대형 욕조와 75인치 TV가 있습니다.",
  },
  {
    name: "한남 오르막 게스트하우스",
    area: "한남",
    type: "게스트하우스",
    rooms: [
      { name: "더블룸", bed: "더블 침대 1개", sizeM2: 15, capacity: 2, price: 78000 },
      { name: "트리플룸", bed: "더블 침대 1개, 싱글 침대 1개", sizeM2: 20, capacity: 3, price: 102500 },
    ],
    cleaningFee: 0,
    rating: 4.72,
    reviewCount: 296,
    amenities: ["wifi", "washer", "kitchen", "pet"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "sage",
    access: "한강진역 도보 9분",
    description: "한남동 언덕 꼭대기의 붉은 벽돌 주택을 고쳤습니다. 마당이 있어 반려견과 함께 묵는 손님이 많습니다.",
  },
  {
    name: "잠실 올림픽 레지던스",
    area: "잠실",
    type: "레지던스",
    rooms: [
      { name: "원룸", bed: "퀸 침대 1개", sizeM2: 28, capacity: 2, price: 104000 },
      { name: "투룸", bed: "퀸 침대 1개, 싱글 침대 2개", sizeM2: 49, capacity: 4, price: 158500 },
    ],
    cleaningFee: 20000,
    rating: 4.6,
    reviewCount: 488,
    amenities: ["kitchen", "washer", "wifi", "parking", "pet"],
    cancellation: { kind: "partial", daysBefore: 5 },
    tone: "linen",
    access: "몽촌토성역 도보 5분",
    description: "올림픽공원 산책로와 바로 이어진 레지던스입니다. 투룸은 가족 단위 장기 숙박에 맞춰 식탁과 세탁건조기를 갖췄습니다.",
  },
  {
    name: "망원 소담 레지던스",
    area: "망원",
    type: "레지던스",
    rooms: [
      { name: "스튜디오", bed: "퀸 침대 1개", sizeM2: 27, capacity: 2, price: 89000 },
      { name: "투룸 스위트", bed: "퀸 침대 1개, 싱글 침대 2개", sizeM2: 50, capacity: 4, price: 147000 },
    ],
    cleaningFee: 15000,
    rating: 4.84,
    reviewCount: 206,
    amenities: ["kitchen", "washer", "wifi", "workspace", "selfCheckin"],
    cancellation: { kind: "partial", daysBefore: 5 },
    tone: "oak",
    access: "망원역 도보 8분",
    description: "한강공원 망원나들목까지 걸어서 5분 거리의 레지던스입니다. 원목 마루와 넓은 창이 있는 조용한 방입니다.",
  },
  {
    name: "모텔 뚝섬",
    area: "성수",
    type: "모텔",
    rooms: [
      { name: "일반실", bed: "퀸 침대 1개", sizeM2: 18, capacity: 2, price: 59000 },
      { name: "특실", bed: "킹 침대 1개", sizeM2: 25, capacity: 2, price: 77000 },
    ],
    cleaningFee: 0,
    rating: 4.53,
    reviewCount: 1104,
    amenities: ["wifi", "parking", "bathtub", "selfCheckin"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "night",
    access: "뚝섬역 도보 3분",
    checkIn: "17:00",
    checkOut: "12:00",
    description: "뚝섬역 바로 앞의 모텔입니다. 전 객실에 스타일러와 PC가 있고 무인 키오스크로 체크인합니다.",
  },
  {
    name: "스테이 인왕",
    area: "서촌",
    type: "게스트하우스",
    rooms: [
      { name: "더블룸", bed: "더블 침대 1개", sizeM2: 16, capacity: 2, price: 84000 },
      { name: "패밀리룸", bed: "퀸 침대 1개, 싱글 침대 2개", sizeM2: 28, capacity: 4, price: 128000 },
    ],
    cleaningFee: 0,
    rating: 4.78,
    reviewCount: 402,
    amenities: ["wifi", "washer", "kitchen"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "linen",
    access: "경복궁역 1번 출구 도보 7분",
    description: "수성동 계곡 가는 길목의 게스트하우스입니다. 인왕산 등산로 입구까지 걸어서 10분 걸립니다.",
  },
  {
    name: "호텔 남산 뷰 을지로",
    area: "을지로",
    type: "호텔",
    rooms: [
      { name: "시티뷰 더블", bed: "퀸 침대 1개", sizeM2: 25, capacity: 2, price: 146000 },
      { name: "남산뷰 디럭스", bed: "킹 침대 1개, 소파 베드 1개", sizeM2: 33, capacity: 3, price: 198000 },
    ],
    cleaningFee: 0,
    rating: 4.86,
    reviewCount: 2904,
    amenities: ["wifi", "breakfast", "parking", "workspace", "bathtub"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "clay",
    access: "충무로역 도보 3분",
    description: "남산 북쪽 기슭을 마주한 호텔입니다. 남산뷰 객실의 통창 너머로 계절마다 바뀌는 숲을 볼 수 있습니다.",
  },
  {
    name: "모텔 한강진",
    area: "한남",
    type: "모텔",
    rooms: [
      { name: "일반실", bed: "퀸 침대 1개", sizeM2: 20, capacity: 2, price: 69900 },
      { name: "스파룸", bed: "킹 침대 1개", sizeM2: 27, capacity: 2, price: 92000 },
    ],
    cleaningFee: 0,
    rating: 4.47,
    reviewCount: 731,
    amenities: ["wifi", "parking", "bathtub"],
    cancellation: { kind: "partial", daysBefore: 1 },
    tone: "night",
    access: "한강진역 도보 2분",
    checkIn: "17:00",
    checkOut: "12:00",
    description: "한강진역 바로 옆에 있어 한남동 공연장과 가깝습니다. 스파룸은 창이 한강 쪽으로 나 있습니다.",
  },
  {
    name: "모텔 모노 연남",
    area: "연남",
    type: "모텔",
    rooms: [
      { name: "스탠다드", bed: "퀸 침대 1개", sizeM2: 18, capacity: 2, price: 61000 },
      { name: "디럭스", bed: "킹 침대 1개", sizeM2: 24, capacity: 2, price: 74500 },
    ],
    cleaningFee: 0,
    rating: 4.51,
    reviewCount: 967,
    amenities: ["wifi", "parking", "bathtub"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "night",
    access: "가좌역 도보 6분",
    checkIn: "17:00",
    checkOut: "12:00",
    description: "흑백 톤으로 꾸민 디자인 모텔입니다. 객실마다 블루투스 스피커와 공기청정기가 있습니다.",
  },
  {
    name: "익선 골목집",
    area: "익선",
    type: "게스트하우스",
    rooms: [
      { name: "더블룸", bed: "더블 침대 1개", sizeM2: 14, capacity: 2, price: 69000 },
      { name: "트리플룸", bed: "더블 침대 1개, 싱글 침대 1개", sizeM2: 19, capacity: 3, price: 91500 },
    ],
    cleaningFee: 0,
    rating: 4.69,
    reviewCount: 488,
    amenities: ["wifi", "washer", "kitchen"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "clay",
    access: "종로3가역 6번 출구 도보 2분",
    description: "익선동 골목 초입에 있는 작은 게스트하우스입니다. 낙원상가와 종묘가 모두 걸어서 5분 거리입니다.",
  },
  {
    name: "연남 그린라인 레지던스",
    area: "연남",
    type: "레지던스",
    rooms: [
      { name: "스튜디오", bed: "퀸 침대 1개", sizeM2: 30, capacity: 2, price: 98000 },
      { name: "패밀리 투룸", bed: "퀸 침대 1개, 싱글 침대 3개", sizeM2: 61, capacity: 5, price: 164000 },
    ],
    cleaningFee: 20000,
    rating: 4.67,
    reviewCount: 219,
    amenities: ["kitchen", "washer", "wifi", "selfCheckin", "pet"],
    cancellation: { kind: "partial", daysBefore: 5 },
    tone: "linen",
    access: "홍대입구역 도보 9분",
    description: "숲길 북쪽 끝에 있는 레지던스입니다. 투룸은 다섯 명까지 묵을 수 있어 가족 여행객이 많이 찾습니다.",
  },
  {
    name: "송리단길 게스트하우스",
    area: "잠실",
    type: "게스트하우스",
    rooms: [
      { name: "더블룸", bed: "더블 침대 1개", sizeM2: 15, capacity: 2, price: 71000 },
      { name: "패밀리룸", bed: "퀸 침대 1개, 싱글 침대 2개", sizeM2: 27, capacity: 4, price: 109000 },
    ],
    cleaningFee: 0,
    rating: 4.75,
    reviewCount: 221,
    amenities: ["wifi", "kitchen", "washer", "selfCheckin"],
    cancellation: { kind: "free", daysBefore: 3 },
    tone: "sage",
    access: "석촌역 도보 4분",
    description: "송리단길 식당 거리 뒤편의 게스트하우스입니다. 석촌호수 산책로까지 걸어서 6분 걸립니다.",
  },
  {
    name: "호텔 리버하우스 망원",
    area: "망원",
    type: "호텔",
    rooms: [
      { name: "스탠다드 더블", bed: "퀸 침대 1개", sizeM2: 22, capacity: 2, price: 112000 },
      { name: "디럭스 트윈", bed: "싱글 침대 2개, 소파 베드 1개", sizeM2: 29, capacity: 3, price: 138500 },
    ],
    cleaningFee: 0,
    rating: 4.58,
    reviewCount: 1024,
    amenities: ["wifi", "parking", "workspace", "breakfast"],
    cancellation: { kind: "free", daysBefore: 1 },
    tone: "concrete",
    access: "합정역 도보 9분",
    description: "한강 쪽으로 창이 난 객실이 절반인 호텔입니다. 1층에 자전거 대여소가 있어 한강 자전거길로 바로 나갈 수 있습니다.",
  },
];

// 사진 순서는 숙소마다 한 칸씩 돌리되, 대표 사진(첫 장)은 앞의 숙소가 아직 쓰지 않은 사진을 고른다.
// 같은 색 조합의 숙소가 같은 대표 사진을 쓰면 결과 목록에서 다른 숙소가 같은 숙소처럼 보인다. 욕실은 대표 사진으로 쓰지 않는다.
function pickPhotoOrder(scenes: PhotoScene[], tone: PhotoTone, firstRotation: number, usedCovers: Set<string>): PhotoScene[] {
  const rotations = scenes.map((_, step) => (firstRotation + step) % scenes.length);
  const rotate = (rotation: number) => [...scenes.slice(rotation), ...scenes.slice(0, rotation)];
  const fresh = rotations.find((rotation) => scenes[rotation] !== "bath" && !usedCovers.has(`${scenes[rotation]}-${tone}`));
  const fallback = rotations.find((rotation) => scenes[rotation] !== "bath") ?? firstRotation;
  const order = rotate(fresh ?? fallback);
  usedCovers.add(`${order[0]}-${tone}`);
  return order;
}

function buildStays(inputs: StayInput[]): Stay[] {
  const slotUsedByArea = new Map<Area, number>();
  const usedCovers = new Set<string>();

  return inputs.map((input, index) => {
    const slotIndex = slotUsedByArea.get(input.area) ?? 0;
    slotUsedByArea.set(input.area, slotIndex + 1);

    const area = AREAS.find((candidate) => candidate.name === input.area);
    if (!area) throw new Error(`지역 정보가 없습니다: ${input.area}`);
    const slot = AREA_SLOTS[slotIndex % AREA_SLOTS.length];

    const scenes = SCENES_BY_TYPE[input.type];
    const id = `stay-${String(index + 1).padStart(2, "0")}`;

    return {
      ...input,
      id,
      rooms: input.rooms.map((room, roomIndex) => ({ ...room, id: `${id}-room-${roomIndex + 1}` })),
      checkIn: input.checkIn ?? "15:00",
      checkOut: input.checkOut ?? "11:00",
      photos: pickPhotoOrder(scenes, input.tone, index % 3, usedCovers),
      pos: { x: area.center.x + slot.x, y: area.center.y + slot.y },
    };
  });
}

export const STAYS: Stay[] = buildStays(INPUTS);

export function lowestPrice(stay: Stay) {
  return Math.min(...stay.rooms.map((room) => room.price));
}

export function maxCapacity(stay: Stay) {
  return Math.max(...stay.rooms.map((room) => room.capacity));
}

export function cancellationText(cancellation: Cancellation) {
  switch (cancellation.kind) {
    case "free":
      return `체크인 ${cancellation.daysBefore}일 전까지 무료 취소`;
    case "partial":
      return `체크인 ${cancellation.daysBefore}일 전까지 50% 환불`;
    case "none":
      return "예약 후 환불 불가";
  }
}
