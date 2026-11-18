# 머물곳: 서울 숙소 예약 웹

주제 id: `2026-11-18-stay`

가상의 국내 숙소 예약 사이트입니다. 서울 8개 동네의 숙소 30곳을 가짜 데이터로 두고, 검색 결과(필터, 목록, 지도)와 숙소 상세(사진, 객실 선택, 예약)를 서버 없이 메모리 상태로 움직입니다. 숙소 사진은 Unsplash 무료 사진 38장을 `public/photos/`에 두고, 지도는 SVG로 직접 그렸습니다.

## 레퍼런스별로 가져온 것과 가져오지 않은 것

### r4 Airbnb: 숙소 카드와 상세 페이지

- 가져온 것: 사진이 가장 큰 세로형 카드(찜 하트, 배지, 사진 넘기기 점과 화살표, 이름과 평점, 1박 요금, 숙박 기간 총액에 밑줄), 상세의 큰 사진 1장과 작은 사진 4장 격자, 사진 모두 보기, 오른쪽에 따라 내려오는 예약 상자(체크인, 체크아웃, 인원 칸, 요금 내역, 총 합계).
- 가져오지 않은 것: 분홍 계열 브랜드 색과 그라데이션 버튼, 알약 모양 헤더 검색창(r5 검색창으로 대신함), 카드 위 필터 칩 줄, 할인 전 가격에 줄을 긋는 표기, 게스트 선호 같은 수상 배지.

### r3 직방: 지도 마커와 목록 연동

- 가져온 것: 지도 위 가격 마커와 목록이 서로 강조되는 관계(카드에 마우스를 올리면 마커가 검게 바뀌고, 마커에 올리면 카드 배경이 바뀜), 마커를 누르면 목록이 그 카드로 스크롤, 좁은 지도 화면에서 마커를 누르면 아래에 미리보기 카드, 만 원 단위로 줄인 마커 금액, 현재 배율에서 겹치는 마커를 "3곳"처럼 묶어 보여 주고 누르면 그 자리로 확대해 풀어 주는 묶음(묶인 숙소의 카드에 마우스를 올리면 묶음이 강조됨).
- 가져오지 않은 것: 주황색 숫자 원 모양의 묶음 표시(가격 마커와 같은 흰 알약에 개수만 적음), 화면 3분의 2를 지도에 주는 비율, 지도 위에 띄운 검색칸과 드롭다운 필터, 목록 위 광고 배너, 지도 타일(동네 위치 관계만 맞춘 단순화한 SVG 지도로 대신함).

### r5 Agoda: 검색창과 두 달 달력

- 가져온 것: 목적지, 체크인, 체크아웃, 인원 칸과 검색 버튼이 한 줄로 나뉜 검색 바, 두 달을 나란히 펼치는 달력, 지난 날짜 흐리게, 오늘 원 표시, 맨 위 선택 기간 요약 줄(날짜와 몇 박), 체크인을 고른 뒤 마우스 위치까지 기간 미리보기.
- 가져오지 않은 것: 노란 요약 배경과 파란 버튼, 달력이 열릴 때 배경 전체를 어둡게 하는 처리(휴대폰 시트에서만 어둡게 함), 상단 홍보 문구와 배경 사진, 기간 선택을 부탁하는 안내 문장.

### r7 Baymard (Crate & Barrel): 왼쪽 필터와 조건 칩

- 가져온 것: +와 -로 접고 펴는 필터 묶음, 항목마다 체크박스와 그 항목을 고르면 남을 숙소 수, 목록 위 결과 수와 정렬, 적용한 조건 칩과 칩별 빼기, 모두 지우기.
- 가져오지 않은 것: 대문자 묶음 제목과 회색 묶음 배경, 크기별 바로가기 버튼 줄, 필터 숨기기와 매장 픽업 같은 버튼 줄, Baymard 주석 카드.

## 동작

- 필터(1박 요금, 숙소 유형, 편의시설, 평점, 무료 취소)는 목록, 지도 마커, 결과 수, 칩을 함께 바꿉니다. 묶음 안은 하나라도 맞으면, 묶음 사이는 모두 맞아야 남고, 편의시설은 고른 것을 모두 갖춰야 남습니다.
- 정렬: 추천순, 낮은 가격순, 평점 높은순.
- 목적지(서울 전체, 동네, 숙소 이름 검색), 날짜, 인원을 바꾸면 결과와 카드의 숙박 총액이 바로 바뀝니다. 인원은 객실 최대 인원으로 숙소를 거릅니다.
- 카드는 사진을 포함해 어디를 눌러도 상세가 열립니다. 사진 좌우 화살표와 찜 버튼만 예외입니다.
- 상세에서 객실을 고르면 예약 상자 요금이 바뀌고, 날짜와 인원은 검색창과 같은 값을 씁니다. 예약하기를 누르면 잠시 진행 표시 뒤 예약 번호와 내역이 있는 확정 화면으로 바뀝니다.
- 상세에서 검색 결과로 돌아오면 필터, 정렬, 스크롤 위치가 그대로입니다.
- 1240px 미만에서는 지도 보기와 목록 보기를 오가는 버튼, 1024px 미만에서는 필터를 왼쪽 서랍으로 엽니다. 640px 미만에서 달력과 인원은 아래에서 올라오는 시트입니다.

## 실행

`apps/today-ref`에서 실행합니다.

```sh
pnpm --filter work-2026-11-18-stay dev
pnpm --filter work-2026-11-18-stay build
```

## 사진 출처

숙소 사진은 모두 [Unsplash 라이선스](https://unsplash.com/license)로 공개된 무료 사진입니다. 2026-11-18에 Unsplash 검색의 무료 필터로 골랐고, 1200px 너비 JPG로 내려받았습니다. 파일 이름은 `<장면>-<색 조합>.jpg`이고 `src/components/StayPhoto.tsx`가 숙소의 장면과 색 조합으로 고릅니다. 사진 속 장소는 실제 숙소 이름이나 위치와 관계없습니다.

| 파일 | 촬영자 | 원본 |
|---|---|---|
| `bedroom-oak.jpg` | laura adai | https://unsplash.com/photos/J60bPeDiR8A |
| `bedroom-linen.jpg` | Vojtech Bruzek | https://unsplash.com/photos/Yrxr3bsPdS0 |
| `bedroom-concrete.jpg` | Alexey Aladashvili | https://unsplash.com/photos/etIFTz0LhFQ |
| `bedroom-hanok.jpg` | J Shim | https://unsplash.com/photos/hoTW8weCnOg |
| `bedroom-sage.jpg` | Lotus Design N Print | https://unsplash.com/photos/RnAo-ha4bpM |
| `bedroom-clay.jpg` | Antonio Araujo | https://unsplash.com/photos/SKs0z89rL2w |
| `bedroom-night.jpg` | Levi Meir Clancy | https://unsplash.com/photos/ucyGnXE4oBc |
| `twin-linen.jpg` | Steven Ungermann | https://unsplash.com/photos/wE7qDv11kio |
| `twin-sage.jpg` | Clay Banks | https://unsplash.com/photos/vFXMsnuOMTg |
| `twin-clay.jpg` | Reimond de Zuñiga | https://unsplash.com/photos/OjRl3G0y4F0 |
| `twin-night.jpg` | Lutetia STLUX | https://unsplash.com/photos/4Zt87dYGpAE |
| `lounge-oak.jpg` | Huy Nguyen | https://unsplash.com/photos/QGxBeUDkeWk |
| `lounge-linen.jpg` | Clay Banks | https://unsplash.com/photos/qdavoiFWGQc |
| `lounge-concrete.jpg` | Aalo Lens | https://unsplash.com/photos/ugIfsN9l_q4 |
| `lounge-hanok.jpg` | Chulho Choi | https://unsplash.com/photos/04SIVgtU_AE |
| `lounge-sage.jpg` | Collov Home Design | https://unsplash.com/photos/UUsQk_9bdR8 |
| `lounge-clay.jpg` | Nereid Ndreu | https://unsplash.com/photos/afEV1IhjkLY |
| `lounge-night.jpg` | Josh Sorenson | https://unsplash.com/photos/8qCTSvYbonM |
| `bath-oak.jpg` | Point3D Commercial Imaging Ltd. | https://unsplash.com/photos/BH9dAWqzcVM |
| `bath-linen.jpg` | Steven Ungermann | https://unsplash.com/photos/Aac7IlKnYX8 |
| `bath-concrete.jpg` | Alex Tyson | https://unsplash.com/photos/BfVqm3io8uE |
| `bath-hanok.jpg` | Andrea Lambrecht | https://unsplash.com/photos/JLS-hsxIlYg |
| `bath-sage.jpg` | Clay Banks | https://unsplash.com/photos/ZGUtbYmOGZE |
| `bath-clay.jpg` | Jared Rice | https://unsplash.com/photos/PibraWHb4h8 |
| `bath-night.jpg` | Laura Desjardins | https://unsplash.com/photos/8U_3kwMvmTQ |
| `facade-oak.jpg` | Taejun Han | https://unsplash.com/photos/IN6clatBDe0 |
| `facade-linen.jpg` | Jonathon Nielsen | https://unsplash.com/photos/X0xrobMV0a4 |
| `facade-concrete.jpg` | Yena Kwon | https://unsplash.com/photos/KJrJxHB7sJQ |
| `facade-hanok.jpg` | Winged Jedi | https://unsplash.com/photos/I7_azqVkHC8 |
| `facade-sage.jpg` | Daniel Bernard | https://unsplash.com/photos/sZ5x5WUYKm4 |
| `facade-clay.jpg` | Seungyun Oh | https://unsplash.com/photos/QOYeyXQ9llE |
| `facade-night.jpg` | realfish | https://unsplash.com/photos/FvIBFE45uHw |
| `view-oak.jpg` | Clark Gu | https://unsplash.com/photos/702B2wM8LiY |
| `view-linen.jpg` | JIWON KANG | https://unsplash.com/photos/2csH9SjutAM |
| `view-concrete.jpg` | Timothée Gidenne | https://unsplash.com/photos/AwlLYexpQhE |
| `view-sage.jpg` | IRa Kang | https://unsplash.com/photos/BBVDY5nfQg8 |
| `view-clay.jpg` | Oat Appleseed | https://unsplash.com/photos/2Du-53nZKYs |
| `hanok-hanok.jpg` | Seval Torun | https://unsplash.com/photos/FPkc-xha2Xk |
