# 머물곳: 서울 숙소 예약 웹

주제 id: `2026-11-18-stay`

가상의 국내 숙소 예약 사이트입니다. 서울 8개 동네의 숙소 30곳을 가짜 데이터로 두고, 검색 결과(필터, 목록, 지도)와 숙소 상세(사진, 객실 선택, 예약)를 서버 없이 메모리 상태로 움직입니다. 숙소 사진은 Unsplash 무료 사진 38장을 `public/photos/`에 두고, 지도는 SVG로 직접 그렸습니다.

## 레퍼런스별로 가져온 것과 가져오지 않은 것

### r4 Airbnb: 숙소 카드와 상세 페이지

- 가져온 것: 사진이 가장 큰 세로형 카드(사진 넘기기 점과 화살표, 이름 줄의 찜 하트, 동네 뒤의 평점, 1박 요금, 숙박 기간 총액에 밑줄), 상세의 큰 사진 1장과 작은 사진 4장 격자, 사진 모두 보기, 오른쪽에 따라 내려오는 예약 상자(체크인, 체크아웃, 인원 칸, 요금 내역, 총 합계). 사진 위 배지와 하트는 2026-11-26 tastepin 다듬기에서 뺐습니다.
- 가져오지 않은 것: 분홍 계열 브랜드 색과 그라데이션 버튼, 알약 모양 헤더 검색창(r5 검색창으로 대신함), 카드 위 필터 칩 줄, 할인 전 가격에 줄을 긋는 표기, 게스트 선호 같은 수상 배지.

### r3 직방: 지도 마커와 목록 연동

- 가져온 것: 지도 위 가격 마커와 목록이 서로 강조되는 관계(카드에 마우스를 올리면 마커만 검게 바뀌고, 마커에 올리면 카드 배경만 바뀜), 마커를 누르면 목록이 그 카드로 스크롤, 좁은 지도 화면에서 마커를 누르면 아래에 미리보기 카드, 만 원 단위로 줄인 마커 금액, 현재 배율에서 겹치는 마커를 "3곳"처럼 묶어 보여 주고 누르면 그 자리로 확대해 풀어 주는 묶음(묶인 숙소의 카드에 마우스를 올리면 묶음이 강조됨).
- 가져오지 않은 것: 주황색 숫자 원 모양의 묶음 표시(가격 마커와 같은 흰 알약에 개수만 적음), 화면 3분의 2를 지도에 주는 비율, 지도 위에 띄운 검색칸과 드롭다운 필터, 목록 위 광고 배너, 지도 타일(동네 위치 관계만 맞춘 단순화한 SVG 지도로 대신함).

### r5 Agoda: 검색창과 두 달 달력

- 가져온 것: 목적지, 체크인, 체크아웃, 인원 칸과 검색 버튼이 한 줄로 나뉜 검색 바, 두 달을 나란히 펼치는 달력, 지난 날짜 흐리게, 맨 위 선택 기간 요약 줄(날짜와 몇 박), 체크인을 고른 뒤 마우스 위치까지 기간 미리보기. 오늘 표시는 2026-11-26에 원 테두리에서 숫자 아래 점으로 바꿨습니다.
- 가져오지 않은 것: 노란 요약 배경과 파란 버튼, 달력이 열릴 때 배경 전체를 어둡게 하는 처리(휴대폰 시트에서만 어둡게 함), 상단 홍보 문구와 배경 사진, 기간 선택을 부탁하는 안내 문장.

### r7 Baymard (Crate & Barrel): 왼쪽 필터와 조건 칩

- 가져온 것: +와 -로 접고 펴는 필터 묶음, 항목마다 체크박스와 그 항목을 고르면 남을 숙소 수, 목록 위 결과 수와 정렬, 적용한 조건 칩과 칩별 빼기, 모두 지우기.
- 가져오지 않은 것: 대문자 묶음 제목과 회색 묶음 배경, 크기별 바로가기 버튼 줄, 필터 숨기기와 매장 픽업 같은 버튼 줄, Baymard 주석 카드.

## 동작

- 필터(1박 요금, 숙소 유형, 편의시설, 평점, 무료 취소)는 목록, 지도 마커, 결과 수, 칩을 함께 바꿉니다. 묶음 안은 하나라도 맞으면, 묶음 사이는 모두 맞아야 남고, 편의시설은 고른 것을 모두 갖춰야 남습니다.
- 정렬: 추천순, 낮은 가격순, 평점 높은순.
- 목적지(서울 전체, 동네, 숙소 이름 검색), 날짜, 인원을 바꾸면 결과와 카드의 숙박 총액이 바로 바뀝니다. 인원은 객실 최대 인원으로 숙소를 거릅니다.
- 카드는 사진을 포함해 어디를 눌러도 상세가 열립니다. 사진 좌우 화살표와 이름 줄의 찜 하트만 예외입니다. 찜은 카드와 상세가 같은 값을 씁니다.
- 상세에서 객실을 고르면 예약 상자 요금이 바뀌고, 날짜와 인원은 검색창과 같은 값을 씁니다. 예약하기를 누르면 잠시 진행 표시 뒤 예약 번호와 내역이 있는 확정 화면으로 바뀝니다.
- 상세에서 검색 결과로 돌아오면 필터, 정렬, 스크롤 위치가 그대로입니다.
- 1240px 미만에서는 지도 보기와 목록 보기를 오가는 버튼, 1024px 미만에서는 필터를 왼쪽 서랍으로 엽니다. 640px 미만에서 달력과 인원은 아래에서 올라오는 시트입니다.
- 1024px 미만의 숙소 상세는 아래에 요금과 날짜, 예약하기가 든 고정 줄을 두고, 예약 상자가 화면에 들어오면 그 줄을 내립니다.
- 머리줄에는 로고와 검색창만 있습니다. 갈 곳이 없던 숙소 등록, 예약 내역, 로그인 버튼은 2026-11-26에 뺐습니다.

## tastepin 다듬기에서 고친 것 (2026-11-26 소급)

이 완성작은 진행 절차에 tastepin 다듬기 단계가 생기기 전(2026-11-22)에 만들어 2026-11-26에 소급해 다듬었습니다. 완성작 폴더에서 받은 취향의 숙소 예약 시편 값과 규칙을 따랐고, 이 폴더의 색과 서체 토큰과 제목 표현은 바꾸지 않았습니다.

- 숙소 카드: 사진 위의 '예약 많은 숙소', '새로 열었어요' 배지와 흰 하트를 지우고, 찜은 이름 줄 오른쪽의 보조색 18px 하트로, 평점은 동네 줄 뒤로 옮겼습니다. 사진 넘김 화살표는 28px, 총액은 '2박 총액'으로 적습니다. '무료 취소'는 초록 면 칩 대신 보조색 글자입니다(사진 숙소 카드 값, 배지와 태그 값).
- 대표 사진: 서로 다른 숙소 9쌍이 같은 대표 사진을 쓰던 것을, 앞 숙소가 아직 쓰지 않은 사진을 대표로 고르게 바꿨습니다. 새 사진은 더하지 않았습니다.
- 지도 연동: 카드에 올리면 마커만, 마커에 올리면 카드만 강조해 hover가 선택처럼 보이지 않게 했습니다(지도와 목록 연동 값).
- 숙소 상세: 제목 아래 평점과 후기 수를 되풀이하던 숫자 세 칸 상자와 예약 상자의 평점을 지웠습니다. 환불 불가 숙소에서 '부분 환불, 체크인 0일 전까지'로 보이던 오류와 '그 이후 취소 시 첫 1박 요금 부과'가 함께 나오던 모순도 고쳤습니다. 저장 버튼은 카드와 같은 '찜'으로 부르고, 누를 수 없는 '후기 n개'의 밑줄을 지웠습니다(규칙: 설명이 필요하면 문구 대신 구조를 고친다).
- 휴대폰 예약 고정 줄: 예약 상자가 보이는 동안 같은 총액과 예약하기를 두 번 보이던 것을, 상자가 화면에 들어오면 줄이 220ms에 내려가고 같은 길로 돌아오게 했습니다(규칙: 휴대폰 보조 띠).
- 머리줄: 눌러도 갈 곳이 없던 숙소 등록, 예약 내역, 로그인을 지우고 검색창을 가운데에 뒀습니다(규칙: 필요 없는 컨트롤을 붙이지 않는다).
- 모서리와 구분: 면, 버튼, 입력을 6px로 맞추고(카드 16px, 사진과 상자 12px, 알약 버튼), 필터 묶음, 상세 절, 인원 행 사이의 구분선을 여백과 굵은 묶음 제목으로 바꿨습니다(화면 전체 값, 규칙: 모서리는 작게 둔다, 그룹은 여백과 글자 굵기로 나눈다).
- 버튼: 필터 서랍의 '숙소 n개 보기'는 초록 주 버튼, 달력 '닫기'는 테두리 보조 버튼으로 맞췄고, 검색, 예약하기, 지도 보기는 누르는 동안 0.95배로 줄어듭니다(누름 반응 값). 필터 적용 수는 검정 원 배지 대신 보조색 숫자입니다.
- 정리: 넓은 화면에서 두 번 보이던 '모두 지우기'는 조건 칩 줄에만 두고(서랍에는 남김), 목적지 목록 행마다 반복되던 핀 아이콘 칸을 지웠습니다.
- 달력: 체크인과 체크아웃은 8px 모서리의 채운 칸, 사이는 이어진 띠로 칠하고, 체크인 뒤 마우스를 올린 날짜까지는 더 옅게 미리 칠하며 그 날짜에 테두리를 둡니다. 오늘은 숫자 아래 4px 점, 몇 박은 굵은 본문색입니다. 달을 넘기면 두 달이 넘기는 방향으로 24px 밀리며 200ms에 겹쳐 바뀝니다(기간 날짜 선택 값, 날짜 선택 값).
- 모션: 검색창과 예약 상자 아래 패널은 위 4px에서 160ms, 휴대폰 시트는 화면 아래에서 300ms, 필터 서랍은 왼쪽에서 300ms, 정렬 메뉴는 220ms에 ease-out-cubic으로 열고 같은 길로 닫습니다. 필터 묶음 펼침도 스프링 없이 220ms 곡선입니다(드로어와 펼침 영역 예외). 본문 줄 간격은 1.55로 맞췄습니다.

취향 값을 따르지 않은 곳: 예약 상자는 취향의 '아래 고정 줄과 한 열 본문' 대신 r4 part의 오른쪽 예약 상자를 지켰고, 상세 사진은 '큰 1장과 썸네일 줄' 대신 r4 part의 격자를, 달력은 '석 달 세로 스크롤' 대신 r5 part의 두 달 나란히 펼침과 화살표를 지켰습니다. 날짜 선택 값의 일요일 빨간 머리글은 이 폴더 토큰에 없는 색이라 넣지 않았고, 결과 화면 폭(1760px)과 상세 폭(1160px)은 필터, 목록, 지도 세 열 구성을 위해 그대로 둡니다.

남긴 것: 넓은 화면 상세는 사진 다섯 장을 모두 격자로 보여 주는데도 '사진 5장 모두 보기'가 같은 다섯 장을 다시 엽니다. 휴대폰에서는 한 장만 보여 필요하고, 새 사진을 더하지 않아 그대로 둡니다. 같은 색 조합의 숙소가 사진보다 많은 2쌍은 여전히 같은 대표 사진입니다.

## 상태로 가는 방법

새로고침 직후 1240px 이상 너비 기준입니다. 활용할 때 이 줄로 바로 그 상태를 띄웁니다.

- r4 사진 넘기기: 결과 카드에 마우스를 올리면 나오는 "다음 사진", 새 사진이 방향 쪽에서 겹쳐 들어옴
- r4 상세의 사진 격자와 예약 상자: 결과 카드 누르기, 아래로 스크롤하면 오른쪽 예약 상자가 따라옴. 사진 격자의 "모두 보기"는 사진 전체 화면
- r4 객실과 예약 확정: 상세의 "객실 선택"에서 다른 객실 고르기, 예약 상자 요금이 바뀜. "예약하기"를 누르면 진행 표시 뒤 확정 화면
- r4 돌아온 카드: 목록을 조금 내린 뒤 카드 누르기, 상세 위의 "검색 결과" 누르기, 같은 스크롤 위치에서 그 카드에 옅은 면이 1초
- r3 목록에서 지도 강조: 결과 카드에 마우스를 올리면 그 숙소 마커가 검게 바뀜(카드 자체는 그대로)
- r3 지도에서 목록 강조: 가격 마커에 마우스를 올리면 그 카드에 옅은 면. 마커(예: "14.3만")를 누르면 그 카드에 진한 테두리가 붙고 목록이 그 카드로 스크롤. 1240px 미만에서는 "지도 보기" 뒤 마커를 누르면 아래 미리보기 카드
- r3 마커 묶음: "n곳" 마커 누르기, 그 자리로 확대해 풀림. "지도 축소"로 되돌림
- r5 두 달 달력과 기간 미리보기: 검색 바의 "체크인" 누르기, 날짜 하나를 고른 뒤 다른 날짜 위로 마우스 옮기기, 미리보기 기간은 확정 기간보다 옅고 가리킨 날짜에 테두리. 위 오른쪽 화살표("다음 달")를 누르면 두 달이 옆으로 밀리며 바뀜. 640px 미만에서는 아래에서 올라오는 시트
- 휴대폰 예약 고정 줄: 375px 너비에서 결과 카드 누르기, 아래 고정 줄이 보이다가 예약 상자까지 내리면 내려감
- r7 필터와 조건 칩: 왼쪽 필터에서 항목 체크, 결과 수와 목록 위 조건 칩이 바뀌고 칩의 ×로 뺌, 칩 줄의 "모두 지우기". 1024px 미만에서는 "필터" 버튼의 서랍(서랍 머리에 "모두 지우기")
- 정렬 메뉴: 목록 위 "추천순" 누르기, 위아래 화살표와 Enter로도 고름

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
