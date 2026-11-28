// 보관함의 바뀌는 데이터(즐겨찾기, 휴지통, 앨범). 서버 없이 메모리에만 두므로 새로고침하면 처음으로 돌아간다.
import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";

import { allItems, initialAlbums, initialFavorites, type Album, type MediaItem } from "./data";

interface GalleryState {
  favorites: string[];
  // 휴지통에 든 항목. 최근에 옮긴 것이 먼저 온다.
  trashed: string[];
  // 휴지통에서 영구 삭제한 항목. 어디에도 다시 나오지 않는다.
  purged: string[];
  albums: Album[];
}

export type GalleryAction =
  | { type: "favorite"; ids: string[]; on: boolean }
  | { type: "trash"; ids: string[] }
  | { type: "restore"; ids: string[] }
  | { type: "purge"; ids: string[] }
  | { type: "create-album"; id: string; name: string; ids: string[] }
  | { type: "add-to-album"; albumId: string; ids: string[] };

const initialState: GalleryState = {
  favorites: initialFavorites,
  trashed: [],
  purged: [],
  albums: initialAlbums,
};

function without(list: string[], ids: string[]) {
  return list.filter((id) => !ids.includes(id));
}

function reducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case "favorite":
      return {
        ...state,
        favorites: action.on ? [...without(state.favorites, action.ids), ...action.ids] : without(state.favorites, action.ids),
      };
    case "trash":
      return { ...state, trashed: [...action.ids, ...without(state.trashed, action.ids)] };
    case "restore":
      return { ...state, trashed: without(state.trashed, action.ids) };
    case "purge":
      return {
        ...state,
        trashed: without(state.trashed, action.ids),
        purged: [...state.purged, ...action.ids],
        favorites: without(state.favorites, action.ids),
        albums: state.albums.map((album) => ({ ...album, items: without(album.items, action.ids) })),
      };
    case "create-album":
      return { ...state, albums: [...state.albums, { id: action.id, name: action.name, items: action.ids }] };
    case "add-to-album":
      return {
        ...state,
        albums: state.albums.map((album) =>
          album.id === action.albumId ? { ...album, items: [...album.items, ...without(action.ids, album.items)] } : album,
        ),
      };
  }
}

interface GalleryValue extends GalleryState {
  dispatch: (action: GalleryAction) => void;
  // 휴지통과 영구 삭제를 뺀, 보관함에 보이는 항목. 최신이 먼저 온다.
  visible: MediaItem[];
  isVisible: (id: string) => boolean;
  isFavorite: (id: string) => boolean;
}

const GalleryContext = createContext<GalleryValue | null>(null);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => {
    const hidden = new Set([...state.trashed, ...state.purged]);
    const favorites = new Set(state.favorites);
    return {
      ...state,
      dispatch,
      visible: allItems.filter((item) => !hidden.has(item.id)),
      isVisible: (id: string) => !hidden.has(id),
      isFavorite: (id: string) => favorites.has(id),
    };
  }, [state]);
  return <GalleryContext value={value}>{children}</GalleryContext>;
}

export function useGallery() {
  const value = useContext(GalleryContext);
  if (!value) throw new Error("GalleryProvider 안에서 써야 합니다");
  return value;
}
