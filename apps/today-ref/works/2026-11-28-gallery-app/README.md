# 낱장 (갤러리 앱 레퍼런스 구현)

- 주제 id: `2026-11-28-gallery-app`
- 플랫폼: 앱 (데스크톱에서는 갤럭시 S26 기본형을 본뜬 프레임, 휴대폰 너비에서는 화면 전체)
- 선택: r1, r2, r5, r4 조합. 사용자가 아니라 AI가 골랐습니다.

## 실행

`apps/today-ref`에서 실행합니다.

```sh
pnpm install
pnpm --filter work-2026-11-28-gallery-app dev
```

## 사용자 결정

- 2026-11-28 사용자 확인: 정체성(코발트 파랑 `#2f5bd8`, 서체 SUIT, 모서리 6px)을 보고 "이대로 확정". 이 확정은 이 완성작에만 해당합니다.

## 고른 이유

주제는 사용자가 정한 "갤러리 앱"입니다. 2026-11-23에 만든 PC 갤러리(창 전체, 폴더 트리와 정보 패널)와 겹치지 않게 휴대폰 갤러리로 열었습니다. 휴대폰 갤러리의 본체는 날짜로 쌓인 사진을 단위를 바꿔 가며 훑는 보관함, 손가락으로 넘기고 확대하고 끌어 닫는 사진 보기, 여러 장을 골라 정리하는 선택입니다. 이 셋을 실제 제품 화면으로 가장 또렷하게 보여 준 Apple 사진(r1), Google 포토(r2), Immich(r5)를 중심에 두고, 앨범 화면은 Ente(r4)에서 가져왔습니다. 시안(r6~r8)은 실제 제품 넷으로 핵심 화면이 채워져 쓰지 않았습니다.

- 뺀 후보: Amazon Photos(r3)의 떠 있는 Filters, Select 알약과 반투명 원 단추는 r1의 단위 전환과 자리가 겹치고, Collections의 인물 줄은 얼굴 인식에 기댑니다. r6 시안의 월 머리말 '전체보기'는 r1의 일 단위 묶음과 역할이 겹치고, r7의 겹친 모음 카드와 r8의 원형 주제 줄, 자르기 화면은 네 개 조합 안에 들지 않았습니다.

## 레퍼런스별로 가져온 부분

- **r1 Apple 사진, 보관함과 사진 정보:** 일 단위에서 하루의 첫 사진을 크게 두고 그 위에 날짜와 장소를 흰 글자로 얹는 격자, 오른쪽 위 선택 단추, 탭 막대 바로 위에 떠 있는 연, 월, 일, 전체 네 칸 전환. 사진 정보의 날짜와 시각, 장소, 파일 이름, 형식 배지가 붙은 카메라 줄, 해상도와 용량, 노출 다섯 칸. 사진 보기 맨 아래 단추 줄.
- **r2 Google 포토, 추억과 선택, 검색:** 보관함 맨 위의 세로로 긴 추억 카드 줄과 카드 아래쪽 흰 제목. 화면 전체 사진에 위쪽 진행 막대가 장마다 차오르는 추억 재생. 선택 중 위의 취소와 'N장 선택됨', 고른 칸의 체크 원과 줄어든 칸, 안 고른 칸의 빈 원. 검색 결과의 마지막 칸을 '+N'으로 덮는 방식.
- **r5 Immich, 사진 보기와 동영상 칸:** 검은 바탕의 사진 보기, 사진을 위로 올리면 아래에서 정보가 올라오는 동작, 격자의 동영상 칸 오른쪽 위 재생 길이.
- **r4 Ente, 앨범:** '기기'의 정사각 폴더 가로 줄과 그 아래 2열 앨범 카드, 카드 아래 '이름 • 개수', 머리말 오른쪽의 새 앨범 단추.

## 가져오지 않은 부분

- 제품 이름, 로고, 브랜드 색과 서체. 가상의 이름 "낱장"과 이 앱의 정체성(무채색 바탕 `#f5f5f4`, 코발트 파랑 `#2f5bd8`, 모서리 6px, 서체 SUIT)을 씁니다.
- 공유. r1의 사진 보기 아래 단추 중 공유와 r2의 공유 시트는 휴대폰의 공유 창에 기대므로 뺐습니다. 사진 보기 아래 단추는 즐겨찾기, 정보, 휴지통 셋입니다.
- r1의 For You 탭, 사람과 장소 찾기, 지도. r2의 Create, Ask 탭과 AI 답변. r5의 업로드 상태와 지도. 아래 탭은 보관함, 앨범, 검색 셋이고, 사진 정보에는 지도 대신 장소 이름을 씁니다.
- 레퍼런스에 없던 부분: 선택 중 아래 동작 막대(즐겨찾기, 앨범에 추가, 휴지통), 앨범에 추가 시트, 새 앨범 시트, 최근 삭제됨과 영구 삭제 확인은 선택한 사진으로 할 일을 이 앱에서 정했습니다.

## 동작

- 칸을 누르면 그 칸 자리에서 사진이 커지며 사진 보기가 열립니다. 좌우로 끌거나 화살표 키로 넘기고, 두 번 누르면 누른 자리를 2.5배로 확대하고 확대한 채 끌어 옮깁니다. 한 번 누르면 위아래 막대를 숨기거나 보입니다.
- 사진을 아래로 끌면 손가락을 따라 작아지고 바탕이 옅어집니다. 충분히 끌고 놓으면 보이는 칸으로 돌아가며 닫히고, 덜 끌면 제자리로 돌아옵니다. 사진을 위로 올리거나 정보 단추를 누르면 정보가 올라오고, 아래로 끌면 내려갑니다. Esc는 정보, 사진 보기 순서로 닫습니다.
- 동영상은 사진 보기에서 재생 단추로 틀고 멈춥니다. 소리가 없는 녹화본이라 재생 막대는 위치를 보여 주기만 합니다.
- 앨범에 추가, 새 앨범, 영구 삭제 시트는 바깥을 누르거나 Esc, 또는 손잡이와 제목 줄을 아래로 끌어 닫습니다. 덜 끌면 제자리로 돌아옵니다.
- 길게 누르거나 '선택'을 누르면 선택이 시작됩니다. 휴지통으로 옮기면 5초 동안 알림 띠에서 실행 취소할 수 있고, 최근 삭제됨에서 복구하거나 확인을 거쳐 영구 삭제합니다.
- 연 카드를 누르면 그해의 월로, 월 카드를 누르면 그달의 첫날로 단위를 바꿔 내려갑니다.
- 추억은 3.5초마다 넘어가고, 오른쪽을 누르면 다음, 왼쪽 3분의 1을 누르면 앞 장, 누르고 있으면 멈춥니다. 마지막 장이 끝나면 닫힙니다.
- 검색은 장소, 나들이 이름, 주제(바다, 산 등)로 찾습니다. 서버 없이 메모리에만 저장하므로 새로고침하면 처음 상태로 돌아갑니다.

## 상태로 가는 방법

`states.json`은 이 중 여섯 상태(일 단위 보관함, 연 단위, 사진 보기 정보, 선택, 앨범, 검색 결과)를 담고 있습니다.

- 일 단위 보관함과 추억 줄: 첫 화면
- 연과 월 카드: 아래 떠 있는 전환의 '연', 연 카드를 누르면 월
- 사진 보기에서 커지기, 넘기기, 확대: 11월 22일의 아무 칸, 좌우로 끌기, 두 번 누르기
- 끌어 닫기: 사진 보기에서 사진을 아래로 끌다 놓기
- 사진 정보: 사진 보기 아래 정보 단추, 또는 사진을 위로 올리기
- 동영상 재생: '전체' 단위에서 재생 길이가 붙은 칸, 사진 보기의 재생 단추
- 추억: 보관함 맨 위의 '제주 바다' 카드
- 선택과 동작 막대: '선택'이나 칸 길게 누르기, 칸 몇 개 누르기
- 앨범에 추가와 새 앨범: 선택한 뒤 동작 막대의 '앨범에 추가', 시트의 '새 앨범'. 시트를 끌어 닫기는 손잡이를 아래로 끌기
- 휴지통과 실행 취소: 선택한 뒤 '휴지통', 알림 띠의 '실행 취소'
- 최근 삭제됨과 영구 삭제: 앨범 탭 맨 아래 '최근 삭제됨', '선택', 칸 누르기, '영구 삭제'
- 빈 앨범: 앨범 탭의 새 앨범 단추로 앨범을 만들면 열리는 빈 화면
- 검색의 +N 칸: 검색 탭의 주제 '바다'

## tastepin 다듬기에서 고친 것

2026-11-28 다듬기(`.refine/2026-11-28-101029`)의 지적입니다. 지적 목록은 같은 폴더의 `findings.json`에 있습니다.

다듬기 전에 취향 규칙과 대조해 정체성 두 가지를 바꿨습니다. 3단계에서 고른 남보라 강조색(`#5a3ee6`)은 "보라 계열은 AI나 자동화 표시에만" 규칙에 걸려 코발트 파랑(`#2f5bd8`)으로, 제목 굵기 800은 "한글 제목에 750 이상 피하기"에 걸려 700으로 낮췄습니다. 알림 띠(아래 16px에서 300ms, 되돌리기 5초), 단위 전환의 미끄러지는 표시, 빈 상태(선 아이콘, 한 줄, 단추 하나), 시트(곡선 300ms, 뒤 화면 0.97배)도 이때 취향 값으로 맞췄습니다.


- 폰 틀 안에서 사진 정보를 열면 사진 위 끝이 위 막대의 날짜 아래 줄과 겹쳤습니다. 사진을 넣을 자리를 계산할 때 상태 표시줄과 제스처 막대 높이를 빼도록 고쳤습니다.
- 사진 보기 위 막대에 날짜 아래 '시각 • 장소' 줄이 있어, 정보를 열면 정보의 같은 줄을 되풀이했습니다. r5에서 고른 대로 뒤로 단추와 날짜만 둡니다.
- 사진 정보가 스프링으로 올라왔습니다. 다른 시트와 같은 곡선 300ms로 오르내립니다.
- 첫 화면의 연, 월, 일, 전체 전환이 투명에서 시작해 나타났습니다. 첫 화면에서는 바로 보이고, 선택을 시작하고 끝낼 때만 움직입니다.
- 단위 전환의 글자색과 선택 중 날짜 제목의 비킴이 정체성 곡선이 아닌 기본 곡선 150ms로 움직였습니다. 정체성 곡선(0.25, 1, 0.5, 1) 200ms로 맞췄습니다.
- 앨범 화면의 기기 폴더는 이름 아래 줄에 개수를, 앨범 카드는 '이름 • 개수' 한 줄로 써서 같은 값이 두 형식이었습니다. 기기 폴더도 '이름 • 개수'로 씁니다.
- 시트의 손잡이 막대가 끌리지 않았습니다. 손잡이와 제목 줄을 아래로 끌면 닫힙니다.
- 남긴 것: 떠 있는 카드(추억, 앨범, 연과 월, 사진 정보의 카메라 묶음)는 r1, r2, r4에 같은 모양이 있어 그대로 둡니다.
- 안 고른 탭 이름과 사진 정보의 파일 이름이 가장 옅은 회색(`--faint`, 대비 약 3.5:1)이었습니다. 하위 검사는 r1도 옅은 회색이라 남겼지만, 색 토큰을 바꾸지 않고 한 단계 진한 `--muted`로 바꿔 4.5:1을 넘깁니다. 사진 밖 글자는 밝고 어두운 화면 모두 기준 미달이 없고, lint가 세는 나머지는 사진 위 흰 글자입니다.
- 남긴 것: lint의 바탕 채도(#151618)와 6px 넘는 모서리(34px, 28px)는 폰 틀 값이라 고치지 않았습니다.

## 사진과 영상 출처

- 사진 59장은 [Unsplash 라이선스](https://unsplash.com/license) 사진을 [Lorem Picsum](https://picsum.photos)에서 2026-11-28에 정한 크기(960x1280, 1280x960, 1080x1080 중 하나와 360x360 미리보기)로 잘라 받았습니다. 사진 속 장소와 날짜, 이름은 관계없이 지어냈습니다.
- 동영상 4개(`public/media/videos`)는 2026-11-23 PC 갤러리 완성작(`works/2026-11-23-gallery`)이 Unsplash 사진으로 녹화한 WebM과 대표 그림을 그대로 복사했습니다. 출처는 그 완성작 README의 "사진과 영상 출처"에 있습니다.

| 파일 | 사진가 | 원본 |
|---|---|---|
| `p13.jpg` | Paul Jarvis | https://unsplash.com/photos/3MtiSMdnoCo |
| `p16.jpg` | Paul Jarvis | https://unsplash.com/photos/gkT4FfgHO5o |
| `p25.jpg` | Alejandro Escamilla | https://unsplash.com/photos/Iuq0EL4EINY |
| `p28.jpg` | Jerry Adney | https://unsplash.com/photos/_WiFMBRT7Aw |
| `p40.jpg` | Ryan Mcguire | https://unsplash.com/photos/N-1XGL54pQg |
| `p42.jpg` | Luke Chesser | https://unsplash.com/photos/KR2mdHJ5qMg |
| `p54.jpg` | Nicholas Swanson | https://unsplash.com/photos/d19by2PLaPc |
| `p63.jpg` | Justin Leibow | https://unsplash.com/photos/ZJsseAxEcqM |
| `p74.jpg` | Isaak Dury | https://unsplash.com/photos/YhZbnxqtooM |
| `p75.jpg` | Jassy Onyae | https://unsplash.com/photos/1gBUXhf0PtA |
| `p77.jpg` | May Pamintuan | https://unsplash.com/photos/j9nfqTi5T5o |
| `p82.jpg` | Rula Sibai | https://unsplash.com/photos/-vq7mi4oF0s |
| `p84.jpg` | Johnny Lam | https://unsplash.com/photos/63qfL0TciY8 |
| `p85.jpg` | Gozha Net | https://unsplash.com/photos/xDrxJCdedcI |
| `p102.jpg` | Ben Moore | https://unsplash.com/photos/pJILiyPdrXI |
| `p106.jpg` | Arvee Marie | https://unsplash.com/photos/YnfGtpt2gf4 |
| `p110.jpg` | Kenneth Thewissen | https://unsplash.com/photos/D76DklsG-5U |
| `p112.jpg` | Zugr | https://unsplash.com/photos/kmF_Aq8gkp0 |
| `p122.jpg` | Vadim Sherbakov | https://unsplash.com/photos/xS_RzdD5CFE |
| `p152.jpg` | Steven Spassov | https://unsplash.com/photos/tVIqMgGlAG0 |
| `p155.jpg` | Christopher Sardegna | https://unsplash.com/photos/4f7r1LuPYj8 |
| `p163.jpg` | Linh Nguyen | https://unsplash.com/photos/oFAVqfTSby8 |
| `p164.jpg` | Linh Nguyen | https://unsplash.com/photos/agkblvPff5U |
| `p165.jpg` | Linh Nguyen | https://unsplash.com/photos/xjXz8GKXcTI |
| `p167.jpg` | petradr | https://unsplash.com/photos/WqK_xV_hbug |
| `p169.jpg` | Noel Lopez | https://unsplash.com/photos/BjelfpszQDw |
| `p177.jpg` | Danka & Peter | https://unsplash.com/photos/tvicgTdh7Fg |
| `p195.jpg` | Matthew Skinner | https://unsplash.com/photos/t05kfHeygbE |
| `p197.jpg` | Kholodnitskiy Maksim | https://unsplash.com/photos/n6TWNDfyPwk |
| `p199.jpg` | Beto Galetto | https://unsplash.com/photos/RL0l7Zk5PxU |
| `p204.jpg` | Tiago Gerken | https://unsplash.com/photos/vCqmY3bfqfo |
| `p206.jpg` | Philipp Reiner | https://unsplash.com/photos/qPJ6eRAMmCM |
| `p215.jpg` | Paula Borowska | https://unsplash.com/photos/04paG2PxKGs |
| `p225.jpg` | Vee O | https://unsplash.com/photos/hGO27G5tZJ8 |
| `p231.jpg` | Aleksandra Boguslawska | https://unsplash.com/photos/XeCvtUX-AE0 |
| `p233.jpg` | Francisco Casero | https://unsplash.com/photos/ytvZF0miwDI |
| `p235.jpg` | Paul E. Harrer | https://unsplash.com/photos/TI-B-TNYJMU |
| `p237.jpg` | André Spieker | https://unsplash.com/photos/8wTPqxlnKM4 |
| `p244.jpg` | Yair Hazout | https://unsplash.com/photos/Y-eIZ3g8_ko |
| `p249.jpg` | Anders Jildén | https://unsplash.com/photos/nrLtvA05jk8 |
| `p256.jpg` | Sylwia Bartyzel | https://unsplash.com/photos/iOPsLuogRao |
| `p260.jpg` | Sylwia Bartyzel | https://unsplash.com/photos/OdAqbedkfiA |
| `p270.jpg` | Victoria Alexander | https://unsplash.com/photos/TXG9VLN1J9U |
| `p289.jpg` | Jennifer Langley | https://unsplash.com/photos/vIqxsp0_p1g |
| `p292.jpg` | Webvilla | https://unsplash.com/photos/hv1MrBzGGNY |
| `p301.jpg` | Tirza van Dijk | https://unsplash.com/photos/Tn4Su6l4j_s |
| `p306.jpg` | Schicka | https://unsplash.com/photos/6T7kfc3VitU |
| `p308.jpg` | Charles L. | https://unsplash.com/photos/5z8CIELxW1Y |
| `p317.jpg` | Paula Borowska | https://unsplash.com/photos/cKYgt4K0g5w |
| `p322.jpg` | Afroz Nawaf | https://unsplash.com/photos/dSyWD7oRns8 |
| `p323.jpg` | Paweł Wojciechowski | https://unsplash.com/photos/QYAojSRu82c |
| `p327.jpg` | Ryan Schroeder | https://unsplash.com/photos/Gg7uKdHFb_c |
| `p335.jpg` | Danka & Peter | https://unsplash.com/photos/EhyiZ9-Zfo0 |
| `p351.jpg` | Rafael Fabricio | https://unsplash.com/photos/nKRVmvjW3rE |
| `p360.jpg` | Cas Cornelissen | https://unsplash.com/photos/G2UTNecskWg |
| `p365.jpg` | Carli Jean | https://unsplash.com/photos/15YDf39RIVc |
| `p369.jpg` | Lou Levit | https://unsplash.com/photos/umcc42T8fD4 |
| `p372.jpg` | Gabriel Santiago | https://unsplash.com/photos/KWkMiUIxcD0 |
| `p374.jpg` | Ma. Alejandra | https://unsplash.com/photos/TDahcrcPhhA |
