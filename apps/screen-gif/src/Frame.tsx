/**
 * 녹화 중인 범위를 둘러싸는 테두리. 창은 녹화 대상보다 테두리 두께만큼 크게 놓이고,
 * 클릭을 통과시키며 녹화 결과에서는 빠진다. 두께는 Rust의 `FRAME_THICKNESS`(논리 픽셀)와 같다.
 */
export function Frame() {
  return <div className="pointer-events-none fixed inset-0 border-2 border-[var(--recording)]" />;
}
