// 2px 간격의 3열 격자. 사진 칸은 모서리 없이 붙인다.
import type { MediaItem } from "../data";
import { Tile } from "./Tile";

export function Grid({
  items,
  scope,
  list,
  trash = false,
}: {
  items: MediaItem[];
  scope: string;
  list: string[];
  trash?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-[2px]">
      {items.map((item) => (
        <Tile key={item.id} item={item} scope={scope} list={list} trash={trash} />
      ))}
    </div>
  );
}
