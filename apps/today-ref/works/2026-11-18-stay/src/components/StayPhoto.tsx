import type { PhotoScene, PhotoTone } from "../data";

// 장면과 색 조합마다 Unsplash 사진 한 장을 public/photos/<장면>-<색 조합>.jpg로 둔다.
// 출처는 README의 사진 출처 표에 있다. 칸의 비율이 달라도 가운데를 기준으로 채운다.
export function StayPhoto({
  tone,
  scene,
  className = "",
}: {
  tone: PhotoTone;
  scene: PhotoScene;
  className?: string;
}) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}photos/${scene}-${tone}.jpg`}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`block h-full w-full bg-canvas object-cover ${className}`}
    />
  );
}
