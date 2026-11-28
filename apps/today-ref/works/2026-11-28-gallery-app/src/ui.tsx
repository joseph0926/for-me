// 화면 사이에 걸친 상태: 여러 장 선택, 사진 보기, 추억 재생, 시트와 알림. App이 소유하고 화면은 이 함수들로 연다.
import { createContext, useContext } from "react";

import type { GalleryAction } from "./gallery";

// 선택은 한 번에 한 곳(보관함, 앨범 하나, 검색)에서만 한다. scope는 그곳의 이름이다.
export interface Selection {
  scope: string;
  ids: string[];
}

export interface ViewerRequest {
  // 좌우로 넘길 목록과 처음 보여 줄 위치
  ids: string[];
  index: number;
  // 사진이 커지기 시작하는 칸의 화면 위치
  from: DOMRect | null;
  // 휴지통에서 열면 아래 단추가 복구와 영구 삭제로 바뀐다
  trash: boolean;
}

export type SheetRequest =
  | { kind: "add-to-album"; ids: string[] }
  | { kind: "new-album"; ids: string[] }
  | { kind: "purge"; ids: string[] };

export interface Toast {
  key: number;
  text: string;
  undo?: GalleryAction;
}

export interface UiValue {
  selection: Selection | null;
  startSelection: (scope: string, firstId?: string) => void;
  toggleSelected: (id: string) => void;
  endSelection: () => void;
  openViewer: (request: ViewerRequest) => void;
  openMemory: (id: string) => void;
  openSheet: (sheet: SheetRequest) => void;
  showToast: (text: string, undo?: GalleryAction) => void;
  openAlbum: (collectionId: string) => void;
  // 빈 앨범에서 사진을 채우러 보관함으로 가 선택을 시작한다
  pickFromLibrary: () => void;
}

export const UiContext = createContext<UiValue | null>(null);

export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error("UiContext 안에서 써야 합니다");
  return value;
}
