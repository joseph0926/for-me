// 올린 이미지를 브라우저 안에서 읽어 색, 밝기, 비율을 계산한다. 서버 분석을 흉내 내지 않고 실제 픽셀에서 얻는 값만 쓴다.

export interface Swatch {
  hex: string;
  name: string;
  // 표본 픽셀 중 이 색 묶음이 차지한 비율(0~1)
  share: number;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  ratio: string;
  orientation: "가로" | "세로" | "정사각";
  brightness: "밝은" | "중간 밝기의" | "어두운";
  temperature: "따뜻한" | "차가운" | "중립적인";
  saturation: "선명한" | "차분한" | "흑백에 가까운";
  contrast: "대비가 강한" | "대비가 부드러운";
  swatches: Swatch[];
  description: string;
  tags: string[];
}

const SAMPLE_SIZE = 64;

export async function analyzeImage(url: string): Promise<ImageAnalysis> {
  const image = await loadImage(url);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width === 0 || height === 0) throw new Error("이미지 크기를 읽지 못했습니다");

  const scale = SAMPLE_SIZE / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("이미지를 읽을 캔버스를 만들지 못했습니다");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  return summarize(readPixels(data), width, height);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 열지 못했습니다"));
    image.src = url;
  });
}

interface Pixel {
  r: number;
  g: number;
  b: number;
  lightness: number;
  saturation: number;
  hue: number;
}

function readPixels(data: Uint8ClampedArray): Pixel[] {
  const pixels: Pixel[] = [];
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 128) continue;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    pixels.push({ r, g, b, ...toHsl(r, g, b) });
  }
  return pixels;
}

function summarize(pixels: Pixel[], width: number, height: number): ImageAnalysis {
  if (pixels.length === 0) throw new Error("투명한 이미지라 색을 읽지 못했습니다");

  const lightnessValues = pixels.map((pixel) => pixel.lightness);
  const meanLightness = average(lightnessValues);
  const meanSaturation = average(pixels.map((pixel) => pixel.saturation));
  const spread = standardDeviation(lightnessValues, meanLightness);

  const colorful = pixels.filter((pixel) => pixel.saturation > 0.2 && pixel.lightness > 0.12 && pixel.lightness < 0.92);
  const warmShare = colorful.filter((pixel) => pixel.hue < 70 || pixel.hue >= 320).length / pixels.length;
  const coolShare = colorful.filter((pixel) => pixel.hue >= 160 && pixel.hue < 280).length / pixels.length;

  const brightness = meanLightness > 0.62 ? "밝은" : meanLightness < 0.36 ? "어두운" : "중간 밝기의";
  const saturation = meanSaturation > 0.42 ? "선명한" : meanSaturation < 0.12 ? "흑백에 가까운" : "차분한";
  const temperature = warmShare > coolShare * 1.4 && warmShare > 0.12 ? "따뜻한" : coolShare > warmShare * 1.4 && coolShare > 0.12 ? "차가운" : "중립적인";
  const contrast = spread > 0.24 ? "대비가 강한" : "대비가 부드러운";
  const orientation = Math.abs(width - height) / Math.max(width, height) < 0.04 ? "정사각" : width > height ? "가로" : "세로";
  const ratio = nearestRatio(width, height);
  const swatches = dominantSwatches(pixels);

  const [first, second] = swatches;
  const colorPhrase = second ? `${first.name}과 ${second.name}이 주를 이루는` : `${first.name}이 주를 이루는`;
  const description = `${orientation} 구도(${ratio})의 ${brightness} 이미지입니다. ${colorPhrase} ${saturation} 색감이고, ${temperature} 톤에 ${contrast} 편입니다.`;

  const tags = [
    temperature === "중립적인" ? "중립 톤" : `${temperature} 톤`,
    saturation === "선명한" ? "고채도" : saturation === "차분한" ? "저채도" : "모노톤",
    contrast === "대비가 강한" ? "고대비" : "부드러운 명암",
    brightness === "어두운" ? "로우키 조명" : brightness === "밝은" ? "하이키 조명" : "자연광",
  ];

  return { width, height, ratio, orientation, brightness, temperature, saturation, contrast, swatches, description, tags };
}

// 색을 채널마다 다섯 단계로 묶어 많이 나온 묶음부터 고르고, 서로 비슷한 묶음은 하나로 친다.
function dominantSwatches(pixels: Pixel[]): Swatch[] {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (const pixel of pixels) {
    const key = [pixel.r, pixel.g, pixel.b].map((channel) => Math.min(4, Math.floor(channel / 52))).join("-");
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += pixel.r;
    bucket.g += pixel.g;
    bucket.b += pixel.b;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
    }))
    .sort((a, b) => b.count - a.count);

  const picked: typeof ranked = [];
  for (const candidate of ranked) {
    if (picked.length === 4) break;
    const distinct = picked.every((color) => colorDistance(color, candidate) > 60);
    if (distinct) picked.push(candidate);
  }

  // 값은 달라도 이름이 같으면 사용자에게는 같은 색으로 읽히므로 한 줄로 합친다.
  const swatches: Swatch[] = [];
  for (const color of picked) {
    const { hue, saturation, lightness } = toHsl(color.r, color.g, color.b);
    const name = colorName(hue, saturation, lightness);
    const share = color.count / pixels.length;
    const same = swatches.find((swatch) => swatch.name === name);
    if (same) same.share += share;
    else swatches.push({ hex: toHex(color.r, color.g, color.b), name, share });
  }
  return swatches;
}

export function colorName(hue: number, saturation: number, lightness: number): string {
  if (lightness < 0.14) return "검정";
  if (lightness > 0.9 && saturation < 0.3) return "흰색";
  if (saturation < 0.14) return lightness > 0.6 ? "밝은 회색" : lightness < 0.35 ? "짙은 회색" : "회색";
  const shade = lightness < 0.42 ? "짙은 " : lightness > 0.72 ? "연한 " : "";
  if (hue < 15 || hue >= 345) return `${shade}빨강`;
  if (hue < 40) return lightness < 0.4 ? "갈색" : `${shade}주황`;
  if (hue < 65) return `${shade}노랑`;
  if (hue < 150) return `${shade}초록`;
  if (hue < 195) return `${shade}청록`;
  if (hue < 240) return `${shade}파랑`;
  if (hue < 265) return `${shade}남색`;
  if (hue < 300) return `${shade}보라`;
  return `${shade}분홍`;
}

const ratios: [string, number][] = [
  ["1:1", 1],
  ["4:3", 4 / 3],
  ["3:2", 3 / 2],
  ["16:9", 16 / 9],
  ["2:1", 2],
  ["21:9", 21 / 9],
  ["4:5", 4 / 5],
  ["3:4", 3 / 4],
  ["2:3", 2 / 3],
  ["9:16", 9 / 16],
  ["1:2", 1 / 2],
];

function nearestRatio(width: number, height: number): string {
  const actual = width / height;
  return ratios.reduce((best, current) => (Math.abs(current[1] - actual) < Math.abs(best[1] - actual) ? current : best))[0];
}

function toHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation, lightness };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], mean: number): number {
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}
