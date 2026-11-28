// 갤러리 앱의 틀. 아래 탭(보관함, 앨범, 검색), 선택 중의 동작 막대, 사진 보기와 추억, 시트와 알림을 소유한다.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Icon, type IconName } from "./components/Icon";
import { Sheets } from "./components/Sheets";
import { GalleryProvider, useGallery, type GalleryAction } from "./gallery";
import { MemoryPlayer } from "./memory/MemoryPlayer";
import { sheet as sheetMotion, toast as toastMotion } from "./motion";
import { AlbumDetail } from "./screens/AlbumDetail";
import { Albums } from "./screens/Albums";
import { Library } from "./screens/Library";
import { Search } from "./screens/Search";
import { UiContext, type Selection, type SheetRequest, type Toast, type UiValue, type ViewerRequest } from "./ui";
import { Viewer } from "./viewer/Viewer";

type Tab = "library" | "albums" | "search";

const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: "library", label: "보관함", icon: "library" },
  { id: "albums", label: "앨범", icon: "albums" },
  { id: "search", label: "검색", icon: "search" },
];

const trashScope = "album:trash";
// 되돌리기를 누를 수 있는 시간(tastepin 여러 개 골라 지우기 값)
const toastMs = 5000;

export function App() {
  return (
    <GalleryProvider>
      <Shell />
    </GalleryProvider>
  );
}

function Shell() {
  const gallery = useGallery();
  const [tab, setTab] = useState<Tab>("library");
  // 앨범 탭에서 연 모음. 없으면 앨범 목록이다.
  const [albumRoute, setAlbumRoute] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [viewer, setViewer] = useState<ViewerRequest | null>(null);
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetRequest | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toastMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((text: string, undo?: GalleryAction) => {
    setToast({ key: Date.now(), text, undo });
  }, []);

  const ui = useMemo<UiValue>(
    () => ({
      selection,
      startSelection: (scope, firstId) => setSelection({ scope, ids: firstId ? [firstId] : [] }),
      toggleSelected: (id) =>
        setSelection((current) =>
          current ? { ...current, ids: current.ids.includes(id) ? current.ids.filter((entry) => entry !== id) : [...current.ids, id] } : current,
        ),
      endSelection: () => setSelection(null),
      openViewer: setViewer,
      openMemory: setMemoryId,
      openSheet: setSheet,
      showToast,
      openAlbum: (collectionId) => {
        setSelection(null);
        setTab("albums");
        setAlbumRoute(collectionId);
      },
      pickFromLibrary: () => {
        setTab("library");
        setSelection({ scope: "library", ids: [] });
      },
    }),
    [selection, showToast],
  );

  function chooseTab(next: Tab) {
    setSelection(null);
    // 지금 탭을 다시 누르면 그 탭의 첫 화면으로 돌아간다
    if (next === tab && next === "albums") setAlbumRoute(null);
    setTab(next);
  }

  const closeSheet = useCallback(() => setSheet(null), []);

  function finishSheet(message: string, after?: { openAlbum?: string; purged?: string[] }) {
    setSheet(null);
    setSelection(null);
    showToast(message);
    if (after?.openAlbum) ui.openAlbum(after.openAlbum);
    // 휴지통 사진 보기에서 마지막 항목을 영구 삭제하면 사진 보기도 닫는다
    if (after?.purged && viewer?.trash) {
      const remaining = viewer.ids.filter((id) => gallery.trashed.includes(id) && !after.purged!.includes(id));
      if (remaining.length === 0) setViewer(null);
    }
  }

  const selected = selection?.ids ?? [];
  const allFavorite = selected.length > 0 && selected.every(gallery.isFavorite);

  function runOnSelection(action: "favorite" | "trash" | "restore") {
    if (selected.length === 0) return;
    if (action === "favorite") {
      gallery.dispatch({ type: "favorite", ids: selected, on: !allFavorite });
      showToast(allFavorite ? `${selected.length}장을 즐겨찾기에서 뺐습니다` : `${selected.length}장을 즐겨찾기했습니다`);
    } else if (action === "trash") {
      gallery.dispatch({ type: "trash", ids: selected });
      showToast(`${selected.length}장을 휴지통으로 옮겼습니다`, { type: "restore", ids: selected });
    } else {
      gallery.dispatch({ type: "restore", ids: selected });
      showToast(`${selected.length}장을 복구했습니다`, { type: "trash", ids: selected });
    }
    setSelection(null);
  }

  return (
    <UiContext value={ui}>
      <div className="relative h-full">
        {/* 시트가 열리면 뒤 화면이 0.97배로 줄며 물러난다(tastepin 드로어 값) */}
        <motion.div
          className="flex h-full origin-center flex-col"
          animate={{ scale: sheet ? 0.97 : 1 }}
          transition={sheetMotion}
        >
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div hidden={tab !== "library"} className="h-full">
            <Library />
          </div>
          <div hidden={tab !== "albums"} className="h-full">
            {albumRoute ? <AlbumDetail key={albumRoute} collectionId={albumRoute} onBack={() => setAlbumRoute(null)} /> : <Albums />}
          </div>
          <div hidden={tab !== "search"} className="h-full">
            <Search />
          </div>
        </div>

        <nav className="relative z-20 bg-raised" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {selection ? (
            <div className="flex h-14 items-stretch justify-around" aria-label="선택한 항목 동작">
              {selection.scope === trashScope ? (
                <>
                  <ActionButton icon="restore" label="복구" disabled={selected.length === 0} onClick={() => runOnSelection("restore")} />
                  <ActionButton
                    icon="trash"
                    label="영구 삭제"
                    disabled={selected.length === 0}
                    onClick={() => setSheet({ kind: "purge", ids: selected })}
                  />
                </>
              ) : (
                <>
                  <ActionButton
                    icon="heart"
                    label={allFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
                    disabled={selected.length === 0}
                    onClick={() => runOnSelection("favorite")}
                  />
                  <ActionButton
                    icon="albumAdd"
                    label="앨범에 추가"
                    disabled={selected.length === 0}
                    onClick={() => setSheet({ kind: "add-to-album", ids: selected })}
                  />
                  <ActionButton icon="trash" label="휴지통" disabled={selected.length === 0} onClick={() => runOnSelection("trash")} />
                </>
              )}
            </div>
          ) : (
            <div role="tablist" className="flex h-14 items-stretch justify-around">
              {tabs.map((entry) => {
                const active = entry.id === tab;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`flex w-20 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-bold text-ink" : "font-medium text-muted"}`}
                    onClick={() => chooseTab(entry.id)}
                  >
                    <Icon name={entry.icon} size={22} className={active ? "text-accent" : undefined} />
                    {entry.label}
                  </button>
                );
              })}
            </div>
          )}
        </nav>
        </motion.div>

        {viewer && <Viewer request={viewer} onClosed={() => setViewer(null)} />}

        <AnimatePresence>{memoryId && <MemoryPlayer key={memoryId} memoryId={memoryId} onClose={() => setMemoryId(null)} />}</AnimatePresence>

        <AnimatePresence>
          {sheet && <Sheets key={sheet.kind} request={sheet} onClose={closeSheet} onDone={finishSheet} onSwitch={setSheet} />}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              role="status"
              className="absolute inset-x-3 z-[35] mx-auto flex max-w-[360px] items-center gap-3 rounded-work bg-inverse py-2.5 pr-2 pl-4 text-[14px] text-white"
              style={{ bottom: 124, boxShadow: "var(--shadow)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={toastMotion}
            >
              <span className="num flex-1">{toast.text}</span>
              {toast.undo && (
                <button
                  type="button"
                  className="h-8 px-2 text-[14px] font-bold text-accent-stage"
                  onClick={() => {
                    gallery.dispatch(toast.undo!);
                    setToast(null);
                  }}
                >
                  실행 취소
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </UiContext>
  );
}

function ActionButton({ icon, label, disabled, onClick }: { icon: IconName; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex w-24 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink disabled:text-faint"
      onClick={onClick}
    >
      <Icon name={icon} size={22} />
      {label}
    </button>
  );
}
