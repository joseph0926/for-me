// 앨범 화면에서 여는 모음. 기기 폴더, 즐겨찾기, 내가 만든 앨범, 최근 삭제됨을 같은 모양으로 푼다.
import { allItems, deviceFolders, itemById, type MediaItem } from "./data";
import type { useGallery } from "./gallery";

type Gallery = ReturnType<typeof useGallery>;

export interface Collection {
  id: string;
  name: string;
  items: MediaItem[];
  trash: boolean;
  // 내가 만든 앨범만 비었을 때 채우는 방법을 안내한다
  userAlbum: boolean;
}

export function resolveCollection(id: string, gallery: Gallery): Collection | null {
  const visible = (ids: string[]) =>
    ids
      .filter(gallery.isVisible)
      .map((itemId) => itemById.get(itemId)!)
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt));

  if (id === "favorites") {
    return { id, name: "즐겨찾기", items: visible(gallery.favorites), trash: false, userAlbum: false };
  }
  if (id === "trash") {
    // 휴지통은 옮긴 순서(최근이 먼저)를 지킨다
    const items = gallery.trashed.map((itemId) => itemById.get(itemId)!);
    return { id, name: "최근 삭제됨", items, trash: true, userAlbum: false };
  }
  if (id.startsWith("device:")) {
    const folder = deviceFolders.find((entry) => `device:${entry.source}` === id);
    if (!folder) return null;
    const items = allItems.filter((item) => item.source === folder.source && gallery.isVisible(item.id));
    return { id, name: folder.name, items, trash: false, userAlbum: false };
  }
  const album = gallery.albums.find((entry) => entry.id === id);
  if (!album) return null;
  return { id, name: album.name, items: visible(album.items), trash: false, userAlbum: true };
}
