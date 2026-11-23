// 보관함 항목의 대표 색을 하나씩 읽어 둔다. 읽기 실패한 항목은 빈 목록으로 남겨 다시 시도하지 않는다.
import { useEffect, useRef, useState } from "react";

import { thumbSrc, type MediaItem } from "./library";
import { extractPalette } from "./palette";

export function usePalettes(items: MediaItem[]): Record<string, string[]> {
  const [palettes, setPalettes] = useState<Record<string, string[]>>({});
  // 이미 읽은 항목. 비동기 작업 안에서 확인하려고 state와 함께 채운다.
  const read = useRef(new Set<string>());
  // 즐겨찾기나 별점이 바뀌어도 항목 배열은 새로 만들어지므로, 항목 구성이 바뀔 때만 다시 돈다.
  const sourcesKey = JSON.stringify(items.map((item) => [item.id, thumbSrc(item)]));

  useEffect(() => {
    let cancelled = false;
    const sources = JSON.parse(sourcesKey) as [string, string][];
    (async () => {
      for (const [id, src] of sources) {
        if (cancelled) return;
        if (read.current.has(id)) continue;
        const palette = await extractPalette(src).catch(() => []);
        if (cancelled) return;
        read.current.add(id);
        setPalettes((previous) => ({ ...previous, [id]: palette }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourcesKey]);

  return palettes;
}
