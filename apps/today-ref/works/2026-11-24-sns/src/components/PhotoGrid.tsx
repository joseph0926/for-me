// 글에 붙은 사진 1~4장. 한 장은 원래 비율(세로는 4:5까지), 두 장은 좌우로 나누고, 세 장은 왼쪽 큰 칸과 오른쪽 두 칸, 네 장은 2x2.
import type { MouseEvent } from "react";

import { useApp } from "../app-context";
import type { Photo } from "../data";

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const { openViewer } = useApp();
  if (photos.length === 0) return null;

  const open = (index: number) => (event: MouseEvent) => {
    event.stopPropagation();
    openViewer(photos, index);
  };

  if (photos.length === 1) {
    const [only] = photos;
    const ratio = Math.max(only.width / only.height, 4 / 5);
    return (
      <button type="button" onClick={open(0)} aria-label={`사진 크게 보기: ${only.alt}`} className="mt-2.5 block w-full overflow-hidden rounded-md bg-[var(--hover)]">
        <img src={only.src} alt={only.alt} loading="lazy" className="block w-full object-cover" style={{ aspectRatio: ratio, maxHeight: 520 }} />
      </button>
    );
  }

  const layout =
    photos.length === 2
      ? "grid-cols-2 grid-rows-1 aspect-[16/9]"
      : photos.length === 3
        ? "grid-cols-2 grid-rows-2 aspect-[16/10]"
        : "grid-cols-2 grid-rows-2 aspect-[4/3]";

  return (
    <div className={`mt-2.5 grid gap-0.5 overflow-hidden rounded-md ${layout}`}>
      {photos.slice(0, 4).map((photo, index) => (
        <button
          key={photo.src + index}
          type="button"
          onClick={open(index)}
          aria-label={`사진 ${index + 1}/${photos.length} 크게 보기: ${photo.alt}`}
          className={`relative min-h-0 overflow-hidden bg-[var(--hover)] ${photos.length === 3 && index === 0 ? "row-span-2" : ""}`}
        >
          <img src={photo.src} alt={photo.alt} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
        </button>
      ))}
    </div>
  );
}
