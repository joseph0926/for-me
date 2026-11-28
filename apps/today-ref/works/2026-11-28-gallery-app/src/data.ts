// 가짜 보관함. 나들이(하루) 단위로 사진을 적고, 화면이 쓰는 항목 목록은 여기서 펼친다.
// 사진은 Unsplash 라이선스 사진을 Lorem Picsum에서 받은 것이고 장소와 날짜는 지어냈다(README의 출처 표).

export type MediaKind = "photo" | "video";
export type Source = "camera" | "download" | "messenger";

export interface Exposure {
  iso: number;
  focal: number;
  ev: number;
  aperture: number;
  shutter: string;
}

export interface MediaItem {
  id: string;
  kind: MediaKind;
  src: string;
  thumb: string;
  // 원본 비율. 사진 보기의 크기와 정보의 해상도에 쓴다.
  width: number;
  height: number;
  takenAt: string;
  outingId: string;
  place: string;
  area: string;
  tags: string[];
  source: Source;
  fileName: string;
  sizeMB: number;
  exposure?: Exposure;
  // 동영상 길이(초). 녹화한 WebM에 길이 정보가 없어 재생기는 이 값을 쓴다.
  seconds?: number;
}

export interface Outing {
  id: string;
  title: string;
  place: string;
  // 검색과 월 카드에 쓰는 짧은 장소 이름
  area: string;
  tags: string[];
  date: string;
  // "42l@15:12"처럼 사진 번호, 방향(p 세로, l 가로, s 정사각), 찍은 시각. 동영상은 "v-coast@17:55".
  shots: string[];
}

const outings: Outing[] = [
  {
    id: "seongsu",
    title: "비 오는 주말",
    place: "서울 성동구 성수동",
    area: "성수동",
    tags: ["카페", "비", "음식"],
    date: "2026-11-22",
    shots: ["42l@15:12", "63s@15:20", "225p@15:41", "365l@16:02", "163p@16:30", "v-rain@16:44"],
  },
  {
    id: "bukhansan",
    title: "가을 산행",
    place: "서울 은평구 북한산",
    area: "북한산",
    tags: ["산", "가을", "단풍"],
    date: "2026-11-08",
    shots: ["335p@09:40", "177p@10:15", "231l@11:02", "167l@12:30", "v-road@13:05", "289p@14:10", "301l@14:25"],
  },
  {
    id: "jeju-2",
    title: "제주 바다 둘째 날",
    place: "제주 서귀포시 중문동",
    area: "서귀포",
    tags: ["바다", "여행"],
    date: "2026-10-19",
    shots: ["374l@10:20", "323p@11:00", "372p@13:15", "215l@15:40", "v-coast@17:55"],
  },
  {
    id: "jeju-1",
    title: "제주 바다",
    place: "제주 제주시 애월읍",
    area: "애월",
    tags: ["바다", "여행"],
    date: "2026-10-18",
    shots: ["13l@14:00", "16l@14:30", "74p@16:10", "199p@17:20"],
  },
  {
    id: "gangneung",
    title: "기차 여행",
    place: "강원 강릉시 정동진",
    area: "강릉",
    tags: ["기차", "여행"],
    date: "2026-09-27",
    shots: ["197p@08:30", "155p@10:40", "204l@11:10", "233p@12:20"],
  },
  {
    id: "gamcheon",
    title: "골목 산책",
    place: "부산 사하구 감천동",
    area: "감천동",
    tags: ["도시", "골목", "밤"],
    date: "2026-08-14",
    shots: ["164l@16:00", "308p@16:40", "369p@17:10", "322p@17:30", "195l@20:15", "351p@20:40"],
  },
  {
    id: "semiwon",
    title: "여름 꽃",
    place: "경기 양평군 양서면",
    area: "양평",
    tags: ["꽃", "여름"],
    date: "2026-07-05",
    shots: ["306s@10:10", "152s@10:35", "360p@11:00", "106p@11:20"],
  },
  {
    id: "breakfast",
    title: "주말 아침",
    place: "서울 마포구 망원동",
    area: "망원동",
    tags: ["음식"],
    date: "2026-06-13",
    shots: ["102l@09:10", "292l@09:40", "75p@10:05"],
  },
  {
    id: "friends",
    title: "우리 집 친구들",
    place: "서울 마포구 망원동",
    area: "망원동",
    tags: ["동물"],
    date: "2026-05-20",
    shots: ["237p@19:00", "169l@19:20", "40s@21:45"],
  },
  {
    id: "daegwallyeong",
    title: "눈 내린 산",
    place: "강원 평창군 대관령면",
    area: "대관령",
    tags: ["눈", "산", "겨울"],
    date: "2025-12-24",
    shots: ["235l@11:00", "256l@11:40", "260p@12:10", "v-peak@12:30", "327l@13:00"],
  },
  {
    id: "gimje",
    title: "가을 들판",
    place: "전북 김제시 진봉면",
    area: "김제",
    tags: ["가을", "들판"],
    date: "2025-10-05",
    shots: ["165l@15:00", "112p@15:30", "85l@16:00", "206l@17:10", "110l@17:40"],
  },
  {
    id: "sokcho",
    title: "해변 산책",
    place: "강원 속초시 조양동",
    area: "속초",
    tags: ["바다"],
    date: "2025-06-21",
    shots: ["77p@18:00", "317l@18:20", "244p@18:40", "270l@19:30"],
  },
  {
    id: "yeouido",
    title: "도시의 밤",
    place: "서울 영등포구 여의도동",
    area: "여의도",
    tags: ["도시", "밤"],
    date: "2024-09-14",
    shots: ["84p@20:10", "249l@20:40", "122l@21:15"],
  },
  {
    id: "jinhae",
    title: "벚꽃",
    place: "경남 창원시 진해구",
    area: "진해",
    tags: ["꽃", "봄"],
    date: "2024-04-06",
    shots: ["82p@10:00", "25p@10:30", "28l@13:20", "54p@15:00"],
  },
];

// 동영상은 2026-11-23 PC 갤러리 완성작이 사진으로 녹화한 WebM을 다시 쓴다.
const videos: Record<string, { width: number; height: number; seconds: number }> = {
  "v-coast": { width: 640, height: 360, seconds: 8 },
  "v-rain": { width: 360, height: 640, seconds: 6 },
  "v-peak": { width: 360, height: 640, seconds: 7 },
  "v-road": { width: 640, height: 360, seconds: 12 },
};

// 기기 폴더 중 카메라가 아닌 곳에서 온 사진
const sources: Record<string, Source> = {
  p63: "download",
  p292: "download",
  p75: "download",
  p102: "download",
  p237: "messenger",
  p40: "messenger",
  p169: "messenger",
};

const ratios = { p: [3, 4], l: [4, 3], s: [1, 1] } as const;
const isoSteps = [50, 64, 100, 125, 200, 320, 400];
const shutters = ["1/2000 s", "1/1000 s", "1/500 s", "1/240 s", "1/120 s", "1/60 s", "1/30 s"];

// 번호에서 정해지는 가짜 노출 값. 밤 사진(18시 이후)은 감도를 올리고 셔터를 느리게 한다.
function exposureFor(seed: number, hour: number): Exposure {
  const night = hour >= 18 ? 3 : 0;
  const step = Math.min(isoSteps.length - 1, (seed % 4) + night);
  return {
    iso: isoSteps[step],
    focal: [24, 24, 13, 70][seed % 4],
    ev: [0, 0, -0.3, 0.3][(seed >> 2) % 4],
    aperture: [1.8, 1.8, 2.2, 2.4][seed % 4],
    shutter: shutters[Math.min(shutters.length - 1, (seed % 3) + night)],
  };
}

function expand(): MediaItem[] {
  let serial = 4100;
  const items: MediaItem[] = [];
  for (const outing of outings) {
    for (const shot of outing.shots) {
      const [name, time] = shot.split("@");
      const takenAt = `${outing.date}T${time}`;
      const hour = Number(time.slice(0, 2));
      const base = {
        takenAt,
        outingId: outing.id,
        place: outing.place,
        area: outing.area,
        tags: outing.tags,
      };
      serial += 7;
      if (name.startsWith("v-")) {
        const video = videos[name];
        items.push({
          ...base,
          id: name,
          kind: "video",
          src: `media/videos/${name}.webm`,
          thumb: `media/videos/${name}.jpg`,
          width: video.width,
          height: video.height,
          seconds: video.seconds,
          source: "camera",
          fileName: `VID_${serial}.mp4`,
          sizeMB: Math.round(video.seconds * 1.8 * 10) / 10,
        });
        continue;
      }
      const number = Number(name.slice(0, -1));
      const [w, h] = ratios[name.slice(-1) as keyof typeof ratios];
      const id = `p${number}`;
      items.push({
        ...base,
        id,
        kind: "photo",
        src: `media/photos/${id}.jpg`,
        thumb: `media/thumbs/${id}.jpg`,
        width: w * 1000,
        height: h * 1000,
        source: sources[id] ?? "camera",
        fileName: `IMG_${serial}.HEIC`,
        sizeMB: Math.round((1.6 + (number % 17) / 7) * 10) / 10,
        exposure: exposureFor(number, hour),
      });
    }
  }
  // 최신이 먼저 온다
  return items.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

export const allItems = expand();
export const itemById = new Map(allItems.map((item) => [item.id, item]));
export const outingById = new Map(outings.map((outing) => [outing.id, outing]));

export function itemsOfOutings(...ids: string[]) {
  return allItems.filter((item) => ids.includes(item.outingId)).map((item) => item.id);
}

export interface Memory {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  items: string[];
}

export const memories: Memory[] = [
  { id: "m-jeju", title: "제주 바다", subtitle: "2026년 10월 18~19일", cover: "p74", items: itemsOfOutings("jeju-1", "jeju-2").reverse() },
  { id: "m-autumn", title: "가을 산행", subtitle: "2026년 11월 8일", cover: "p167", items: itemsOfOutings("bukhansan").reverse() },
  { id: "m-spring", title: "2년 전 봄", subtitle: "2024년 4월 6일", cover: "p82", items: itemsOfOutings("jinhae").reverse() },
  { id: "m-alley", title: "골목 산책", subtitle: "2026년 8월 14일", cover: "p308", items: itemsOfOutings("gamcheon").reverse() },
  { id: "m-snow", title: "눈 내린 산", subtitle: "2025년 12월 24일", cover: "p260", items: itemsOfOutings("daegwallyeong").reverse() },
];

export const deviceFolders: { source: Source; name: string }[] = [
  { source: "camera", name: "카메라" },
  { source: "download", name: "다운로드" },
  { source: "messenger", name: "메신저" },
];

export interface Album {
  id: string;
  name: string;
  items: string[];
}

export const initialAlbums: Album[] = [
  { id: "a-jeju", name: "제주 2026", items: itemsOfOutings("jeju-1", "jeju-2") },
  { id: "a-autumn", name: "가을 산책", items: itemsOfOutings("bukhansan", "gimje") },
  { id: "a-home", name: "우리 집", items: itemsOfOutings("breakfast", "friends") },
];

export const initialFavorites = ["p74", "p335", "p152", "p82", "p244", "v-coast", "p237"];

// 검색 첫 화면의 주제 칩
export const searchTopics = ["바다", "산", "가을", "꽃", "카페", "기차", "골목", "눈", "동물", "음식", "밤"];
