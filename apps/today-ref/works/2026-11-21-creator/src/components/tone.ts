// 크리에이터마다 하나의 색상(hue)을 두고 강조색과 옅은 바탕을 계산한다. 브랜드 색 대신 쓰는 가상의 색이다.
export function creatorAccent(hue: number): string {
  return `hsl(${hue} 68% 48%)`;
}

export function creatorSoft(hue: number): string {
  return `hsl(${hue} 70% 50% / 0.12)`;
}
