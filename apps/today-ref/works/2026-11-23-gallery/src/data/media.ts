// 가상 보관함. bytes는 public/media에 둔 실제 파일의 크기이고 이름, 폴더, 찍은 날, 태그, 별점은 가상이다. 사진 출처는 README에 있다.
import type { MediaSeed } from "../library";

export const seedItems: MediaSeed[] = [
  {
    "id": "p102",
    "kind": "image",
    "src": "media/photos/p102.jpg",
    "name": "산딸기.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 55912,
    "takenAt": "2026-11-19T04:32",
    "folder": "일상",
    "tags": [
      "음식"
    ],
    "rating": 0,
    "credit": {
      "author": "Ben Moore",
      "url": "https://unsplash.com/photos/pJILiyPdrXI"
    }
  },
  {
    "id": "p108",
    "kind": "image",
    "src": "media/photos/p108.jpg",
    "name": "야자수 해변.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 78619,
    "takenAt": "2026-11-16T23:15",
    "folder": "여행",
    "tags": [
      "바다",
      "자연"
    ],
    "rating": 3,
    "credit": {
      "author": "Florian Klauer",
      "url": "https://unsplash.com/photos/t1mqA3V3-7g"
    }
  },
  {
    "id": "p113",
    "kind": "image",
    "src": "media/photos/p113.jpg",
    "name": "김 나는 컵.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 50983,
    "takenAt": "2026-11-15T22:01",
    "folder": "일상",
    "tags": [
      "음식"
    ],
    "rating": 5,
    "credit": {
      "author": "Zugr",
      "url": "https://unsplash.com/photos/yZf1quatKCA"
    }
  },
  {
    "id": "p118",
    "kind": "image",
    "src": "media/photos/p118.jpg",
    "name": "엉겅퀴 언덕.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 123875,
    "takenAt": "2026-11-13T19:00",
    "folder": "여행",
    "tags": [
      "산",
      "자연"
    ],
    "rating": 0,
    "credit": {
      "author": "Rick Waalders",
      "url": "https://unsplash.com/photos/d-Cr8MEW5Uc"
    }
  },
  {
    "id": "v-coast",
    "kind": "video",
    "src": "media/videos/v-coast.webm",
    "poster": "media/videos/v-coast.jpg",
    "name": "등대 해안 산책.webm",
    "width": 640,
    "height": 360,
    "duration": 8,
    "bytes": 833432,
    "takenAt": "2026-11-12T13:38",
    "folder": "영상",
    "tags": [
      "바다"
    ],
    "rating": 0
  },
  {
    "id": "p123",
    "kind": "image",
    "src": "media/photos/p123.jpg",
    "name": "물방울 표면.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 70513,
    "takenAt": "2026-10-12T13:38",
    "folder": "일상",
    "tags": [
      "접사"
    ],
    "rating": 4,
    "credit": {
      "author": "Mark Doda",
      "url": "https://unsplash.com/photos/tS9hJOnmKK8"
    }
  },
  {
    "id": "p128",
    "kind": "image",
    "src": "media/photos/p128.jpg",
    "name": "호숫가 풀숲.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 119611,
    "takenAt": "2026-10-10T09:30",
    "folder": "여행",
    "tags": [
      "자연"
    ],
    "rating": 0,
    "credit": {
      "author": "Matteo Minelli",
      "url": "https://unsplash.com/photos/hlnucYOsL-c"
    }
  },
  {
    "id": "p133",
    "kind": "image",
    "src": "media/photos/p133.jpg",
    "name": "노란 문 앞 자동차.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 179639,
    "takenAt": "2026-10-08T06:38",
    "folder": "도시",
    "tags": [
      "거리"
    ],
    "rating": 0,
    "credit": {
      "author": "Dietmar Becker",
      "url": "https://unsplash.com/photos/8Zt0xOOK4nI"
    }
  },
  {
    "id": "g-slides",
    "kind": "gif",
    "src": "media/gifs/g-slides.gif",
    "name": "산딸기 넘기기.gif",
    "width": 480,
    "height": 320,
    "bytes": 1013596,
    "takenAt": "2026-10-06T03:02",
    "folder": "움짤",
    "tags": [
      "음식"
    ],
    "rating": 0
  },
  {
    "id": "p139",
    "kind": "image",
    "src": "media/photos/p139.jpg",
    "name": "나무 숟가락.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 85296,
    "takenAt": "2026-08-07T03:02",
    "folder": "일상",
    "tags": [
      "음식",
      "접사"
    ],
    "rating": 3,
    "credit": {
      "author": "Steve Richey",
      "url": "https://unsplash.com/photos/M-1MRfncLk0"
    }
  },
  {
    "id": "p144",
    "kind": "image",
    "src": "media/photos/p144.jpg",
    "name": "흑백 부두.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 122494,
    "takenAt": "2026-08-05T23:01",
    "folder": "흑백",
    "tags": [
      "바다",
      "흑백"
    ],
    "rating": 5,
    "credit": {
      "author": "Mouly Kumar",
      "url": "https://unsplash.com/photos/TuOiIpkIea8"
    }
  },
  {
    "id": "p151",
    "kind": "image",
    "src": "media/photos/p151.jpg",
    "name": "흑백 일몰.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 42618,
    "takenAt": "2026-08-03T20:20",
    "folder": "흑백",
    "tags": [
      "흑백",
      "자연"
    ],
    "rating": 0,
    "credit": {
      "author": "Edoardo Loru",
      "url": "https://unsplash.com/photos/xPfj_Kdcal4"
    }
  },
  {
    "id": "p156",
    "kind": "image",
    "src": "media/photos/p156.jpg",
    "name": "모래 발자국.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 157504,
    "takenAt": "2026-08-03T16:06",
    "folder": "여행",
    "tags": [
      "바다",
      "접사"
    ],
    "rating": 4,
    "credit": {
      "author": "Christopher Sardegna",
      "url": "https://unsplash.com/photos/iRyGmA_no2Q"
    }
  },
  {
    "id": "v-city",
    "kind": "video",
    "src": "media/videos/v-city.webm",
    "poster": "media/videos/v-city.jpg",
    "name": "도시 내려다보기 영상.webm",
    "width": 640,
    "height": 360,
    "duration": 10,
    "bytes": 1379507,
    "takenAt": "2026-08-01T14:08",
    "folder": "영상",
    "tags": [
      "거리"
    ],
    "rating": 0
  },
  {
    "id": "p161",
    "kind": "image",
    "src": "media/photos/p161.jpg",
    "name": "이끼 낀 통나무.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 162979,
    "takenAt": "2026-08-01T11:13",
    "folder": "여행",
    "tags": [
      "자연",
      "접사"
    ],
    "rating": 0,
    "credit": {
      "author": "Chloe Benko-Prieur",
      "url": "https://unsplash.com/photos/ti4uz330CwU"
    }
  },
  {
    "id": "p166",
    "kind": "image",
    "src": "media/photos/p166.jpg",
    "name": "흑백 계곡.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 119475,
    "takenAt": "2026-08-01T06:03",
    "folder": "흑백",
    "tags": [
      "산",
      "흑백"
    ],
    "rating": 0,
    "credit": {
      "author": "Romain Briaux",
      "url": "https://unsplash.com/photos/yD3PXDV7Sjc"
    }
  },
  {
    "id": "p171",
    "kind": "image",
    "src": "media/photos/p171.jpg",
    "name": "빗방울 창.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 65082,
    "takenAt": "2026-06-13T06:03",
    "folder": "도시",
    "tags": [
      "밤",
      "거리"
    ],
    "rating": 3,
    "credit": {
      "author": "Riley Briggs",
      "url": "https://unsplash.com/photos/cSe3oKQ03OQ"
    }
  },
  {
    "id": "p176",
    "kind": "image",
    "src": "media/photos/p176.jpg",
    "name": "바위 해안 등대.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 124096,
    "takenAt": "2026-06-11T04:49",
    "folder": "여행",
    "tags": [
      "바다"
    ],
    "rating": 5,
    "credit": {
      "author": "Good Free Photos",
      "url": "https://unsplash.com/photos/WO4bxwzHRe8"
    }
  },
  {
    "id": "p181",
    "kind": "image",
    "src": "media/photos/p181.jpg",
    "name": "터널 출구.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 50967,
    "takenAt": "2026-06-11T00:03",
    "folder": "도시",
    "tags": [
      "거리",
      "길"
    ],
    "rating": 0,
    "credit": {
      "author": "Nick Turner",
      "url": "https://unsplash.com/photos/0EjvnhOkPLM"
    }
  },
  {
    "id": "p186",
    "kind": "image",
    "src": "media/photos/p186.jpg",
    "name": "안개 숲길.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 107094,
    "takenAt": "2026-06-09T22:48",
    "folder": "여행",
    "tags": [
      "자연",
      "길"
    ],
    "rating": 4,
    "credit": {
      "author": "Simon Pape",
      "url": "https://unsplash.com/photos/2kc8bigeqEI"
    }
  },
  {
    "id": "p191",
    "kind": "image",
    "src": "media/photos/p191.jpg",
    "name": "산길 도로.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 156234,
    "takenAt": "2026-06-09T17:15",
    "folder": "여행",
    "tags": [
      "산",
      "길"
    ],
    "rating": 0,
    "credit": {
      "author": "Alex Talmon",
      "url": "https://unsplash.com/photos/6iat9p85VnQ"
    }
  },
  {
    "id": "v-peak",
    "kind": "video",
    "src": "media/videos/v-peak.webm",
    "poster": "media/videos/v-peak.jpg",
    "name": "설산 세로 영상.webm",
    "width": 360,
    "height": 640,
    "duration": 7,
    "bytes": 992990,
    "takenAt": "2026-04-15T17:15",
    "folder": "영상",
    "tags": [
      "산"
    ],
    "rating": 0
  },
  {
    "id": "g-breathe",
    "kind": "gif",
    "src": "media/gifs/g-breathe.gif",
    "name": "책상 숨쉬기.gif",
    "width": 360,
    "height": 360,
    "bytes": 933742,
    "takenAt": "2026-04-15T15:29",
    "folder": "움짤",
    "tags": [
      "작업실"
    ],
    "rating": 0
  },
  {
    "id": "p196",
    "kind": "image",
    "src": "media/photos/p196.jpg",
    "name": "사막 모래 언덕.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 70104,
    "takenAt": "2026-04-14T12:40",
    "folder": "여행",
    "tags": [
      "자연"
    ],
    "rating": 0,
    "credit": {
      "author": "Dyaa Eldin Moustafa",
      "url": "https://unsplash.com/photos/mR_HR8NZwg8"
    }
  },
  {
    "id": "p201",
    "kind": "image",
    "src": "media/photos/p201.jpg",
    "name": "책상 위 안경.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 72878,
    "takenAt": "2026-04-14T07:15",
    "folder": "일상",
    "tags": [
      "작업실"
    ],
    "rating": 3,
    "credit": {
      "author": "Craig Garner",
      "url": "https://unsplash.com/photos/YoadQb46v6k"
    }
  },
  {
    "id": "p208",
    "kind": "image",
    "src": "media/photos/p208.jpg",
    "name": "창밖 나무.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 140485,
    "takenAt": "2026-03-02T07:15",
    "folder": "일상",
    "tags": [
      "작업실",
      "자연"
    ],
    "rating": 5,
    "credit": {
      "author": "Martin Wessely",
      "url": "https://unsplash.com/photos/NYxxuBSQzp4"
    }
  },
  {
    "id": "p213",
    "kind": "image",
    "src": "media/photos/p213.jpg",
    "name": "새벽 바다.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 54810,
    "takenAt": "2026-03-01T06:30",
    "folder": "여행",
    "tags": [
      "바다"
    ],
    "rating": 0,
    "credit": {
      "author": "Kelly Sikkema",
      "url": "https://unsplash.com/photos/X7dy114KWs4"
    }
  },
  {
    "id": "p218",
    "kind": "image",
    "src": "media/photos/p218.jpg",
    "name": "절벽 사이 바다.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 50667,
    "takenAt": "2026-03-01T03:19",
    "folder": "여행",
    "tags": [
      "바다",
      "산"
    ],
    "rating": 4,
    "credit": {
      "author": "Monika Majkowska",
      "url": "https://unsplash.com/photos/Nq8LdWC7HnM"
    }
  },
  {
    "id": "p223",
    "kind": "image",
    "src": "media/photos/p223.jpg",
    "name": "도시 불빛.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 58359,
    "takenAt": "2026-02-27T02:12",
    "folder": "도시",
    "tags": [
      "밤",
      "거리"
    ],
    "rating": 0,
    "credit": {
      "author": "Maria Carrasco",
      "url": "https://unsplash.com/photos/vwY2D2Wr4ME"
    }
  },
  {
    "id": "p230",
    "kind": "image",
    "src": "media/photos/p230.jpg",
    "name": "호수 오두막.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 80253,
    "takenAt": "2026-02-26T23:35",
    "folder": "여행",
    "tags": [
      "자연"
    ],
    "rating": 0,
    "credit": {
      "author": "Wes Carr",
      "url": "https://unsplash.com/photos/rFKUFzjPYiQ"
    }
  },
  {
    "id": "v-road",
    "kind": "video",
    "src": "media/videos/v-road.webm",
    "poster": "media/videos/v-road.jpg",
    "name": "산길 드라이브.webm",
    "width": 640,
    "height": 360,
    "duration": 12,
    "bytes": 1694452,
    "takenAt": "2026-01-23T23:35",
    "folder": "영상",
    "tags": [
      "길",
      "산"
    ],
    "rating": 0
  },
  {
    "id": "p235",
    "kind": "image",
    "src": "media/photos/p235.jpg",
    "name": "설산.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 115559,
    "takenAt": "2026-01-23T22:36",
    "folder": "여행",
    "tags": [
      "산"
    ],
    "rating": 3,
    "credit": {
      "author": "Paul E. Harrer",
      "url": "https://unsplash.com/photos/TI-B-TNYJMU"
    }
  },
  {
    "id": "p240",
    "kind": "image",
    "src": "media/photos/p240.jpg",
    "name": "흑백 계단.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 131691,
    "takenAt": "2026-01-22T17:09",
    "folder": "흑백",
    "tags": [
      "흑백",
      "거리"
    ],
    "rating": 5,
    "credit": {
      "author": "Elisabetta Foco",
      "url": "https://unsplash.com/photos/dFkCXUMB4r4"
    }
  },
  {
    "id": "p247",
    "kind": "image",
    "src": "media/photos/p247.jpg",
    "name": "붉은 바위산.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 160708,
    "takenAt": "2026-01-21T12:03",
    "folder": "여행",
    "tags": [
      "산",
      "자연"
    ],
    "rating": 0,
    "credit": {
      "author": "Georgia Dixon",
      "url": "https://unsplash.com/photos/wuHPFRWtDLI"
    }
  },
  {
    "id": "p252",
    "kind": "image",
    "src": "media/photos/p252.jpg",
    "name": "분해한 타자기.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 89188,
    "takenAt": "2025-12-07T12:03",
    "folder": "일상",
    "tags": [
      "작업실"
    ],
    "rating": 4,
    "credit": {
      "author": "Florian Klauer",
      "url": "https://unsplash.com/photos/-K6JMRMj4x4"
    }
  },
  {
    "id": "g-orbit",
    "kind": "gif",
    "src": "media/gifs/g-orbit.gif",
    "name": "공전하는 점.gif",
    "width": 320,
    "height": 320,
    "bytes": 28891,
    "takenAt": "2025-12-05T06:36",
    "folder": "움짤",
    "tags": [],
    "rating": 0
  },
  {
    "id": "p257",
    "kind": "image",
    "src": "media/photos/p257.jpg",
    "name": "운하 저녁.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 91198,
    "takenAt": "2025-12-03T02:55",
    "folder": "도시",
    "tags": [
      "밤",
      "거리"
    ],
    "rating": 0,
    "credit": {
      "author": "Emanuele Pinna",
      "url": "https://unsplash.com/photos/3EYK2njhLxc"
    }
  },
  {
    "id": "p263",
    "kind": "image",
    "src": "media/photos/p263.jpg",
    "name": "낡은 건물과 차.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 97852,
    "takenAt": "2025-12-03T00:27",
    "folder": "도시",
    "tags": [
      "거리"
    ],
    "rating": 0,
    "credit": {
      "author": "Kristian Karlsson",
      "url": "https://unsplash.com/photos/NUBjCmEgbHM"
    }
  },
  {
    "id": "p268",
    "kind": "image",
    "src": "media/photos/p268.jpg",
    "name": "해변 의자.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 197319,
    "takenAt": "2025-11-02T00:27",
    "folder": "여행",
    "tags": [
      "바다"
    ],
    "rating": 3,
    "credit": {
      "author": "davide ragusa",
      "url": "https://unsplash.com/photos/vc3ZOCf5BN8"
    }
  },
  {
    "id": "v-rain",
    "kind": "video",
    "src": "media/videos/v-rain.webm",
    "poster": "media/videos/v-rain.jpg",
    "name": "비 오는 창 세로 영상.webm",
    "width": 360,
    "height": 640,
    "duration": 6,
    "bytes": 668315,
    "takenAt": "2025-10-30T23:24",
    "folder": "영상",
    "tags": [
      "밤"
    ],
    "rating": 0
  },
  {
    "id": "p273",
    "kind": "image",
    "src": "media/photos/p273.jpg",
    "name": "강변 항구.jpg",
    "width": 1200,
    "height": 800,
    "bytes": 87532,
    "takenAt": "2025-10-30T21:14",
    "folder": "도시",
    "tags": [
      "바다",
      "거리"
    ],
    "rating": 5,
    "credit": {
      "author": "Wim Peters",
      "url": "https://unsplash.com/photos/cyi4rNpSxBE"
    }
  },
  {
    "id": "p278",
    "kind": "image",
    "src": "media/photos/p278.jpg",
    "name": "숲 터널 도로.jpg",
    "width": 800,
    "height": 1200,
    "bytes": 111659,
    "takenAt": "2025-10-28T18:26",
    "folder": "여행",
    "tags": [
      "길",
      "자연"
    ],
    "rating": 0,
    "credit": {
      "author": "Taylor Leopold",
      "url": "https://unsplash.com/photos/6QQqqvq4R9A"
    }
  },
  {
    "id": "p283",
    "kind": "image",
    "src": "media/photos/p283.jpg",
    "name": "도시 내려다보기.jpg",
    "width": 1000,
    "height": 1000,
    "bytes": 190054,
    "takenAt": "2025-10-26T17:02",
    "folder": "도시",
    "tags": [
      "거리"
    ],
    "rating": 4,
    "credit": {
      "author": "Wojtek Witkowski",
      "url": "https://unsplash.com/photos/GtxZbYMCiPY"
    }
  },
  {
    "id": "p290",
    "kind": "image",
    "src": "media/photos/p290.jpg",
    "name": "성당 골목.jpg",
    "width": 1280,
    "height": 720,
    "bytes": 75629,
    "takenAt": "2025-10-24T11:29",
    "folder": "도시",
    "tags": [
      "거리"
    ],
    "rating": 0,
    "credit": {
      "author": "Aleksandar Vacić",
      "url": "https://unsplash.com/photos/nAZOGbSWK9o"
    }
  }
];
