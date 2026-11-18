# 머물곳 숙소 사진 생성 프롬프트

2026-11-18에 생성 비용 때문에 Unsplash 무료 사진으로 대신했습니다. 지금 화면은 이 프롬프트로 만든 사진을 쓰지 않으며, 사진 출처는 [README](../README.md#사진-출처)에 있습니다. 같은 파일 이름으로 생성한 사진을 넣으면 그대로 바꿔 쓸 수 있습니다.

숙소 사진을 SVG 일러스트 대신 실제 사진처럼 바꾸기 위한 GPT Image 프롬프트입니다. 지금 숙소 30곳이 실제로 쓰는 장면과 색 조합 38가지만 담았습니다.

## 쓰는 법

- 크기는 `1536x1024`(가로 3:2)로 생성합니다. 카드(20:17), 상세 큰 사진(16:10), 작은 사진(4:3)은 화면에서 가운데를 잘라 씁니다.
- 결과는 각 프롬프트 제목의 파일 이름 그대로 `works/2026-11-18-stay/public/photos/`에 JPG로 저장합니다. 저장해 주시면 화면에 연결합니다.
- 같은 색 조합의 사진은 같은 숙소 안에서 함께 보이므로, 한 조합을 생성할 때는 장면이 달라도 같은 대화에서 이어서 만들면 톤이 맞습니다.
- 공통 문장은 모든 프롬프트 끝에 이미 붙어 있습니다.

## 공통 문장

```text
Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

## 프롬프트

### `bath-clay.jpg` 욕실, 테라코타 호텔

```text
Bathroom with a walk-in shower or bathtub, vanity with mirror, folded white towels. Mid-range design hotel: warm beige and terracotta tones, travertine or stone surfaces, small brass details used sparingly. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bath-concrete.jpg` 욕실, 콘크리트 개조

```text
Bathroom with a walk-in shower or bathtub, vanity with mirror, folded white towels. Converted old industrial building in Seongsu or Euljiro: exposed concrete ceiling and walls, black steel window frames, walnut furniture, a few industrial lamps. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bath-hanok.jpg` 욕실, 한옥

```text
Bathroom with a walk-in shower or bathtub, vanity with mirror, folded white towels. Traditional Korean hanok stay: exposed wooden beams and rafters, hanji paper sliding doors with wooden lattice, oiled yellow paper ondol floor, low wooden furniture, folded yo bedding. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bath-linen.jpg` 욕실, 밝은 기본형

```text
Bathroom with a walk-in shower or bathtub, vanity with mirror, folded white towels. Bright, airy and practical: off-white walls, pale wood, white bedding, simple furniture typical of a well-kept guesthouse or business hotel. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bath-night.jpg` 욕실, 모텔 저녁

```text
Bathroom with a walk-in shower or bathtub, vanity with mirror, folded white towels. Clean modern Korean motel room photographed in the early evening with warm artificial lighting: dark wood wall panels, large bed, slightly dated but well maintained. No neon, no red or purple lighting. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bath-oak.jpg` 욕실, 오크 레지던스

```text
Bathroom with a walk-in shower or bathtub, vanity with mirror, folded white towels. Serviced residence apartment: light oak floor, white plaster walls, linen curtains, beige and muted green accents, tidy and homely. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bath-sage.jpg` 욕실, 세이지 그린

```text
Bathroom with a walk-in shower or bathtub, vanity with mirror, folded white towels. Calm boutique style: muted sage green walls or textiles, light wood, a few real plants, soft daylight. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bedroom-clay.jpg` 침실, 테라코타 호텔

```text
Bedroom with a made queen or double bed, bedside lamps, a window with daylight. Mid-range design hotel: warm beige and terracotta tones, travertine or stone surfaces, small brass details used sparingly. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bedroom-concrete.jpg` 침실, 콘크리트 개조

```text
Bedroom with a made queen or double bed, bedside lamps, a window with daylight. Converted old industrial building in Seongsu or Euljiro: exposed concrete ceiling and walls, black steel window frames, walnut furniture, a few industrial lamps. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bedroom-hanok.jpg` 침실, 한옥

```text
Bedroom with a made queen or double bed, bedside lamps, a window with daylight. Traditional Korean hanok stay: exposed wooden beams and rafters, hanji paper sliding doors with wooden lattice, oiled yellow paper ondol floor, low wooden furniture, folded yo bedding. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bedroom-linen.jpg` 침실, 밝은 기본형

```text
Bedroom with a made queen or double bed, bedside lamps, a window with daylight. Bright, airy and practical: off-white walls, pale wood, white bedding, simple furniture typical of a well-kept guesthouse or business hotel. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bedroom-night.jpg` 침실, 모텔 저녁

```text
Bedroom with a made queen or double bed, bedside lamps, a window with daylight. Clean modern Korean motel room photographed in the early evening with warm artificial lighting: dark wood wall panels, large bed, slightly dated but well maintained. No neon, no red or purple lighting. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bedroom-oak.jpg` 침실, 오크 레지던스

```text
Bedroom with a made queen or double bed, bedside lamps, a window with daylight. Serviced residence apartment: light oak floor, white plaster walls, linen curtains, beige and muted green accents, tidy and homely. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `bedroom-sage.jpg` 침실, 세이지 그린

```text
Bedroom with a made queen or double bed, bedside lamps, a window with daylight. Calm boutique style: muted sage green walls or textiles, light wood, a few real plants, soft daylight. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `facade-clay.jpg` 외관, 테라코타 호텔

```text
Exterior of the building seen from the street, daytime, neighborhood context of a Seoul side street. Mid-range design hotel: warm beige and terracotta tones, travertine or stone surfaces, small brass details used sparingly. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `facade-concrete.jpg` 외관, 콘크리트 개조

```text
Exterior of a renovated brick and concrete low-rise building on a Seongsu or Euljiro side street, daytime. Converted old industrial building in Seongsu or Euljiro: exposed concrete ceiling and walls, black steel window frames, walnut furniture, a few industrial lamps. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `facade-hanok.jpg` 외관, 한옥

```text
Exterior of a hanok seen from a narrow Seochon or Ikseon alley: wooden gate, stone wall, tiled roof, daytime. Traditional Korean hanok stay: exposed wooden beams and rafters, hanji paper sliding doors with wooden lattice, oiled yellow paper ondol floor, low wooden furniture, folded yo bedding. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `facade-linen.jpg` 외관, 밝은 기본형

```text
Exterior of the building seen from the street, daytime, neighborhood context of a Seoul side street. Bright, airy and practical: off-white walls, pale wood, white bedding, simple furniture typical of a well-kept guesthouse or business hotel. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `facade-night.jpg` 외관, 모텔 저녁

```text
Exterior of a small modern motel building on a Seoul street at dusk, warm lights in a few windows, signage without readable letters. Clean modern Korean motel room photographed in the early evening with warm artificial lighting: dark wood wall panels, large bed, slightly dated but well maintained. No neon, no red or purple lighting. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `facade-oak.jpg` 외관, 오크 레지던스

```text
Exterior of the building seen from the street, daytime, neighborhood context of a Seoul side street. Serviced residence apartment: light oak floor, white plaster walls, linen curtains, beige and muted green accents, tidy and homely. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `facade-sage.jpg` 외관, 세이지 그린

```text
Exterior of the building seen from the street, daytime, neighborhood context of a Seoul side street. Calm boutique style: muted sage green walls or textiles, light wood, a few real plants, soft daylight. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `hanok-hanok.jpg` 한옥 마당, 한옥

```text
View from the wooden maru porch onto a small hanok courtyard (madang) with tiled roofs, stone steps and a little greenery, daytime. Traditional Korean hanok stay: exposed wooden beams and rafters, hanji paper sliding doors with wooden lattice, oiled yellow paper ondol floor, low wooden furniture, folded yo bedding. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `lounge-clay.jpg` 거실, 테라코타 호텔

```text
Living area with a sofa, coffee table, a small dining table or kitchenette. Mid-range design hotel: warm beige and terracotta tones, travertine or stone surfaces, small brass details used sparingly. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `lounge-concrete.jpg` 거실, 콘크리트 개조

```text
Living area with a sofa, coffee table, a small dining table or kitchenette. Converted old industrial building in Seongsu or Euljiro: exposed concrete ceiling and walls, black steel window frames, walnut furniture, a few industrial lamps. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `lounge-hanok.jpg` 거실, 한옥

```text
Living area with a sofa, coffee table, a small dining table or kitchenette. Traditional Korean hanok stay: exposed wooden beams and rafters, hanji paper sliding doors with wooden lattice, oiled yellow paper ondol floor, low wooden furniture, folded yo bedding. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `lounge-linen.jpg` 거실, 밝은 기본형

```text
Living area with a sofa, coffee table, a small dining table or kitchenette. Bright, airy and practical: off-white walls, pale wood, white bedding, simple furniture typical of a well-kept guesthouse or business hotel. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `lounge-night.jpg` 거실, 모텔 저녁

```text
Living area with a sofa, coffee table, a small dining table or kitchenette. Clean modern Korean motel room photographed in the early evening with warm artificial lighting: dark wood wall panels, large bed, slightly dated but well maintained. No neon, no red or purple lighting. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `lounge-oak.jpg` 거실, 오크 레지던스

```text
Living area with a sofa, coffee table, a small dining table or kitchenette. Serviced residence apartment: light oak floor, white plaster walls, linen curtains, beige and muted green accents, tidy and homely. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `lounge-sage.jpg` 거실, 세이지 그린

```text
Living area with a sofa, coffee table, a small dining table or kitchenette. Calm boutique style: muted sage green walls or textiles, light wood, a few real plants, soft daylight. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `twin-clay.jpg` 트윈룸, 테라코타 호텔

```text
Twin room with two single beds side by side, a small desk. Mid-range design hotel: warm beige and terracotta tones, travertine or stone surfaces, small brass details used sparingly. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `twin-linen.jpg` 트윈룸, 밝은 기본형

```text
Twin room with two single beds side by side, a small desk. Bright, airy and practical: off-white walls, pale wood, white bedding, simple furniture typical of a well-kept guesthouse or business hotel. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `twin-night.jpg` 트윈룸, 모텔 저녁

```text
Twin room with two single beds side by side, a small desk. Clean modern Korean motel room photographed in the early evening with warm artificial lighting: dark wood wall panels, large bed, slightly dated but well maintained. No neon, no red or purple lighting. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `twin-sage.jpg` 트윈룸, 세이지 그린

```text
Twin room with two single beds side by side, a small desk. Calm boutique style: muted sage green walls or textiles, light wood, a few real plants, soft daylight. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `view-clay.jpg` 창밖 전망, 테라코타 호텔

```text
View from the room window over Seoul: city rooftops, apartment blocks or the Han River in the distance, window frame partly visible. Mid-range design hotel: warm beige and terracotta tones, travertine or stone surfaces, small brass details used sparingly. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `view-concrete.jpg` 창밖 전망, 콘크리트 개조

```text
View from the room window over Seoul: city rooftops, apartment blocks or the Han River in the distance, window frame partly visible. Converted old industrial building in Seongsu or Euljiro: exposed concrete ceiling and walls, black steel window frames, walnut furniture, a few industrial lamps. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `view-linen.jpg` 창밖 전망, 밝은 기본형

```text
View from the room window over Seoul: city rooftops, apartment blocks or the Han River in the distance, window frame partly visible. Bright, airy and practical: off-white walls, pale wood, white bedding, simple furniture typical of a well-kept guesthouse or business hotel. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `view-oak.jpg` 창밖 전망, 오크 레지던스

```text
View from the room window over Seoul: city rooftops, apartment blocks or the Han River in the distance, window frame partly visible. Serviced residence apartment: light oak floor, white plaster walls, linen curtains, beige and muted green accents, tidy and homely. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```

### `view-sage.jpg` 창밖 전망, 세이지 그린

```text
View from the room window over Seoul: city rooftops, apartment blocks or the Han River in the distance, window frame partly visible. Calm boutique style: muted sage green walls or textiles, light wood, a few real plants, soft daylight. Photorealistic photograph for an accommodation listing on a Korean booking website, Seoul, South Korea. Shot by a professional property photographer on a full-frame camera, 24mm lens, camera at chest height, level verticals, realistic lighting that matches the time of day, true-to-life colors, realistic small imperfections (slight creases in bedding, everyday objects placed naturally). No people, no text, no logos, no watermarks, no readable signage. Not a 3D render, not an illustration, no dramatic glow, no HDR look, no magazine styling. Landscape 3:2.
```
