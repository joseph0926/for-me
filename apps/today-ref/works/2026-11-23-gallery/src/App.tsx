// 담음: PC 갤러리. 왼쪽 목록, 가운데 격자, 오른쪽 정보 패널의 3단(r1)에 크게 보기를 겹쳐 띄운다.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { ContextMenu, type MenuState } from "./components/ContextMenu";
import { FilterBar } from "./components/FilterBar";
import { Grid, type SelectMods } from "./components/Grid";
import { ImportIcon, InfoIcon, MenuIcon, SearchIcon, TrashIcon } from "./components/Icons";
import { InfoPanel } from "./components/InfoPanel";
import { SelectionBar } from "./components/SelectionBar";
import { Sheet } from "./components/Sheet";
import { Sidebar } from "./components/Sidebar";
import { maxToasts, Toasts, type Toast } from "./components/Toasts";
import { Viewer } from "./components/Viewer";
import { seedItems } from "./data/media";
import { importFiles } from "./importFiles";
import {
  allTags,
  applyFilters,
  countByKind,
  createLibrary,
  emptyFilters,
  groupItems,
  itemsInPlace,
  libraryReducer,
  placeLabel,
  sortItems,
  type Filters,
  type MediaItem,
  type Place,
  type SortKey,
} from "./library";
import { isNear } from "./palette";
import { usePalettes } from "./usePalettes";

const wideLayout = () => window.innerWidth >= 1100;

export function App() {
  const [items, dispatch] = useReducer(libraryReducer, seedItems, createLibrary);
  const palettes = usePalettes(items);
  const [place, setPlace] = useState<Place>({ type: "all" });
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("taken");
  const [rowHeight, setRowHeight] = useState(190);
  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(wideLayout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const matchesColor = useCallback((item: MediaItem, color: string) => isNear(palettes[item.id] ?? [], color), [palettes]);
  const groups = useMemo(() => {
    const filtered = applyFilters(itemsInPlace(items, place), filters, matchesColor);
    return groupItems(sortItems(filtered, sort), sort);
  }, [items, place, filters, sort, matchesColor]);
  const ordered = groups.flatMap((group) => group.items);
  const orderedIds = ordered.map((item) => item.id);
  const visibleSelection = ordered.filter((item) => selected.includes(item.id));
  const selectedSet = new Set(visibleSelection.map((item) => item.id));
  const viewerIndex = viewerId ? orderedIds.indexOf(viewerId) : -1;
  const counts = countByKind(ordered);
  const placeItems = itemsInPlace(items, place);
  const tags = allTags(items.filter((item) => !item.trashed));

  const showToast = (message: string, undo?: () => void) =>
    setToasts((current) => [...current, { id: Date.now() + Math.random(), message, undo }].slice(-maxToasts));
  const dismissToast = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);


  const changePlace = (next: Place) => {
    setPlace(next);
    setSelected([]);
    setAnchor(null);
    setFocusId(null);
    setSidebarOpen(false);
  };

  const select = (id: string, mods: SelectMods) => {
    setFocusId(id);
    if (mods.range && anchor && orderedIds.includes(anchor)) {
      const [from, to] = [orderedIds.indexOf(anchor), orderedIds.indexOf(id)].sort((a, b) => a - b);
      const span = orderedIds.slice(from, to + 1);
      setSelected(mods.toggle ? [...new Set([...selected, ...span])] : span);
      return;
    }
    setAnchor(id);
    if (mods.toggle) setSelected(selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id]);
    else setSelected([id]);
  };

  const clearSelection = () => {
    setSelected([]);
    setAnchor(null);
  };

  const trash = (ids: string[]) => {
    if (ids.length === 0) return;
    if (viewerId && ids.includes(viewerId)) {
      // 크게 보기에서 지우면 같은 자리의 다음 항목, 마지막이었다면 앞 항목으로 넘어간다.
      const rest = orderedIds.filter((id) => !ids.includes(id));
      const next = rest[Math.min(viewerIndex, rest.length - 1)] ?? null;
      setViewerId(next);
    }
    dispatch({ type: "patch", ids, patch: { trashed: true } });
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    showToast(`${ids.length}개를 휴지통으로 옮겼습니다`, () => dispatch({ type: "patch", ids, patch: { trashed: false } }));
  };

  const deleteForever = (ids: string[]) => {
    for (const item of items) {
      if (!ids.includes(item.id) || !item.imported) continue;
      URL.revokeObjectURL(item.src);
    }
    dispatch({ type: "deleteForever", ids });
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    showToast(`${ids.length}개를 영구 삭제했습니다`);
  };

  const runImport = async (files: File[]) => {
    if (files.length === 0) return;
    const nextOrder = Math.max(0, ...items.map((item) => item.addedOrder)) + 1;
    const result = await importFiles(files, nextOrder);
    if (result.items.length > 0) {
      dispatch({ type: "import", items: result.items });
      changePlace({ type: "folder", name: "가져온 항목" });
      setSelected(result.items.map((item) => item.id));
      setAnchor(result.items[0].id);
    }
    const parts = [result.items.length > 0 && `${result.items.length}개를 가져왔습니다`, ...result.rejected];
    showToast(parts.filter(Boolean).join(". "));
  };

  // 운영체제에서 파일을 끌어 오면 창 전체를 놓을 자리로 보여 준다.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDropping(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDropping(false);
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDropping(false);
      void runImport([...(event.dataTransfer?.files ?? [])]);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  });

  // 격자의 키보드 조작. 크게 보기와 메뉴가 열려 있으면 그쪽이 키를 받는다.
  useEffect(() => {
    if (viewerId || menu) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [role='menu']")) return;
      const ids = visibleSelection.map((item) => item.id);
      const current = focusId && orderedIds.includes(focusId) ? focusId : null;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(orderedIds);
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const next = neighbour(current, event.key, orderedIds);
        if (next) select(next, { toggle: false, range: event.shiftKey });
      } else if ((event.key === "Enter" || event.key === " ") && current) {
        event.preventDefault();
        setViewerId(current);
      } else if (event.key === "Escape") clearSelection();
      else if (event.key === "Delete" && ids.length > 0 && place.type !== "trash") trash(ids);
      else if ((event.key === "f" || event.key === "F") && ids.length > 0) dispatch({ type: "toggleFavorite", ids });
      else if (/^[0-5]$/.test(event.key) && ids.length > 0) dispatch({ type: "patch", ids, patch: { rating: Number(event.key) } });
      else if (event.key === "i" || event.key === "I") setInfoOpen((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const menuTargets = menu ? items.filter((item) => menu.ids.includes(item.id)) : [];
  const openMenu = (id: string, x: number, y: number) => {
    // 고른 항목 위에서 누르면 고른 항목 전체에, 아니면 그 항목만 고르고 메뉴를 연다.
    const ids = selectedSet.has(id) ? visibleSelection.map((item) => item.id) : [id];
    if (!selectedSet.has(id)) {
      setSelected([id]);
      setAnchor(id);
    }
    setFocusId(id);
    setMenu({ x, y, ids });
  };

  const infoPanel = (
    <InfoPanel
      selection={viewerId ? ordered.filter((item) => item.id === viewerId) : visibleSelection}
      visible={ordered}
      palette={viewerId ? palettes[viewerId] : visibleSelection.length === 1 ? palettes[visibleSelection[0].id] : undefined}
      allTags={tags}
      colorFilter={filters.color}
      dispatch={dispatch}
      onColorFilter={(hex) => {
        setFilters({ ...filters, color: filters.color === hex ? null : hex });
        setViewerId(null);
      }}
      onTrash={trash}
    />
  );

  const emptyMessage =
    place.type === "trash" && placeItems.length === 0 ? (
      <EmptyState title="휴지통이 비어 있습니다" body="지운 항목은 여기에서 복원하거나 영구 삭제할 수 있습니다." />
    ) : placeItems.length === 0 ? (
      <EmptyState title={`${placeLabel(place)}에 항목이 없습니다`} body="파일을 창에 끌어다 놓거나 가져오기로 추가하세요." />
    ) : (
      <EmptyState
        title="조건에 맞는 항목이 없습니다"
        body={`${placeLabel(place)}의 ${placeItems.length}개 중 거르기와 검색에 맞는 항목이 없습니다.`}
        action={{ label: "거르기와 검색 지우기", run: () => setFilters(emptyFilters) }}
      />
    );

  const sheetOpen = sidebarOpen || (infoOpen && (viewerId !== null || !wideLayout()));

  return (
    <>
    {/* 아래 시트가 열리면 뒤 화면이 0.97배로 물러난다(tastepin 드로어). */}
    <motion.div
      animate={{ scale: sheetOpen ? 0.97 : 1 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="flex h-dvh flex-col bg-[var(--surface)]"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 px-2 sm:px-3">
        <button
          type="button"
          aria-label="보관함 목록"
          onClick={() => setSidebarOpen(true)}
          className="grid size-8 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] md:hidden"
        >
          <MenuIcon size={18} />
        </button>
        <div className="hidden w-[196px] shrink-0 items-center gap-2 pl-1.5 md:flex">
          <span className="grid size-6 place-items-center rounded-md bg-[var(--ink)] text-[13px] font-bold text-[var(--surface)]">담</span>
          <span className="text-[14px] font-[650]">담음</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] leading-tight font-[650]">{placeLabel(place)}</h1>
          <p className="truncate text-[13px] leading-tight text-[var(--muted)]">
            사진 {counts.image.toLocaleString()}장, 동영상 {counts.video}개, GIF {counts.gif}개
            {ordered.length !== placeItems.length && ` (전체 ${placeItems.length}개 중)`}
          </p>
        </div>
        {place.type === "trash" && placeItems.length > 0 && (
          <TwoStepButton label="휴지통 비우기" armedLabel="정말 비우기" onConfirm={() => deleteForever(placeItems.map((item) => item.id))} />
        )}
        <label className="flex h-8 w-[min(260px,38vw)] items-center gap-2 rounded-md bg-[var(--hover)] px-2.5 text-[var(--muted)] focus-within:ring-2 focus-within:ring-[var(--accent)]">
          <SearchIcon size={16} />
          <input
            type="search"
            aria-label="이름, 태그, 메모 검색"
            placeholder="이름, 태그, 메모"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Escape") event.currentTarget.blur();
            }}
            className="min-w-0 flex-1 bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--faint)]"
          />
        </label>
        <button
          type="button"
          aria-label="파일 가져오기"
          onClick={() => fileInput.current?.click()}
          className="grid size-8 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)] md:hidden"
        >
          <ImportIcon size={18} />
        </button>
        <button
          type="button"
          aria-label="정보 패널"
          aria-pressed={infoOpen}
          onClick={() => setInfoOpen((open) => !open)}
          className={`grid size-8 place-items-center rounded-md hover:bg-[var(--hover)] ${infoOpen ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
        >
          <InfoIcon size={18} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[212px] shrink-0 bg-[var(--panel)] md:block">
          <Sidebar items={items} place={place} onPlace={changePlace} onImport={() => fileInput.current?.click()} />
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col" aria-label={`${placeLabel(place)} 격자`}>
          <FilterBar
            filters={filters}
            onFilters={setFilters}
            placeItems={placeItems}
            tags={tags}
            sort={sort}
            onSort={setSort}
            rowHeight={rowHeight}
            onRowHeight={setRowHeight}
          />
          <Grid
            groups={groups}
            rowHeight={rowHeight}
            selected={selectedSet}
            focusId={focusId}
            empty={emptyMessage}
            onSelect={select}
            onClearSelection={clearSelection}
            onOpen={(id) => (place.type === "trash" ? undefined : setViewerId(id))}
            onContextMenu={openMenu}
          />
          <SelectionBar
            count={visibleSelection.length}
            allFavorite={visibleSelection.every((item) => item.favorite)}
            inTrash={place.type === "trash"}
            onFavorite={() => dispatch({ type: "toggleFavorite", ids: visibleSelection.map((item) => item.id) })}
            onTrash={() => trash(visibleSelection.map((item) => item.id))}
            onRestore={() => {
              const ids = visibleSelection.map((item) => item.id);
              dispatch({ type: "patch", ids, patch: { trashed: false } });
              showToast(`${ids.length}개를 복원했습니다`);
            }}
            onClear={clearSelection}
          />
        </main>

        {infoOpen && !viewerId && (
          <aside className="hidden w-[288px] shrink-0 overflow-y-auto bg-[var(--panel)] thin-scroll lg:block" aria-label="정보">
            {infoPanel}
          </aside>
        )}
      </div>

    </motion.div>

      {/* 좁은 화면에서는 목록과 정보 패널을 옆에서 밀려 나오는 서랍으로 띄운다. */}
      <AnimatePresence>
        {sidebarOpen && (
          <Sheet onClose={() => setSidebarOpen(false)} label="보관함 목록" className="md:hidden">
            <Sidebar items={items} place={place} onPlace={changePlace} onImport={() => fileInput.current?.click()} />
          </Sheet>
        )}
        {/* 크게 보기 중에는 md 이상에서 옆 패널을 쓰므로 그보다 좁을 때만 서랍을 크게 보기 위로 띄운다. */}
        {infoOpen && (
          <Sheet onClose={() => setInfoOpen(false)} label="정보" raised={Boolean(viewerId)} className={viewerId ? "md:hidden" : "lg:hidden"}>
            {infoPanel}
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewerId && viewerIndex >= 0 && (
          <div className="fixed inset-0 z-30 flex">
            <div className="min-w-0 flex-1">
              <Viewer
                items={ordered}
                index={viewerIndex}
                onIndex={(index) => {
                  setViewerId(orderedIds[index]);
                  setFocusId(orderedIds[index]);
                  setSelected([orderedIds[index]]);
                  setAnchor(orderedIds[index]);
                }}
                onClose={() => setViewerId(null)}
                onFavorite={(id) => dispatch({ type: "toggleFavorite", ids: [id] })}
                onTrash={(id) => trash([id])}
                infoOpen={infoOpen}
                onToggleInfo={() => setInfoOpen((open) => !open)}
              />
            </div>
            {infoOpen && (
              <aside className="hidden w-[288px] shrink-0 overflow-y-auto bg-[var(--panel)] thin-scroll md:block" aria-label="정보">
                {infoPanel}
              </aside>
            )}
          </div>
        )}
      </AnimatePresence>

      {menu && menuTargets.length > 0 && (
        <ContextMenu
          menu={menu}
          targets={menuTargets}
          sort={sort}
          onClose={() => setMenu(null)}
          onOpen={() => setViewerId(menu.ids[0])}
          onSort={setSort}
          onFavorite={() => dispatch({ type: "toggleFavorite", ids: menu.ids })}
          onColorTag={(colorTag) => dispatch({ type: "patch", ids: menu.ids, patch: { colorTag } })}
          onRating={(rating) => dispatch({ type: "patch", ids: menu.ids, patch: { rating } })}
          onMove={(folder) => {
            dispatch({ type: "patch", ids: menu.ids, patch: { folder } });
            showToast(`${menu.ids.length}개를 ${folder} 폴더로 옮겼습니다`);
          }}
          onTrash={() => trash(menu.ids)}
          onRestore={() => {
            dispatch({ type: "patch", ids: menu.ids, patch: { trashed: false } });
            showToast(`${menu.ids.length}개를 복원했습니다`);
          }}
          onDeleteForever={() => deleteForever(menu.ids)}
        />
      )}


      <AnimatePresence>
        {dropping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-md border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)]/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 text-[var(--ink)]">
              <span className="grid size-14 place-items-center rounded-full bg-[var(--raised)] text-[var(--accent)] shadow-[var(--shadow)]">
                <ImportIcon size={26} />
              </span>
              <p className="text-[15px] font-[650]">여기에 놓아 가져오기</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          void runImport([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    </>
  );
}

// 방향키로 옮길 다음 항목. 위아래는 화면에서 바로 위나 아래 줄 중 가로 가운데가 가장 가까운 칸이다.
function neighbour(current: string | null, key: string, ids: string[]): string | null {
  if (ids.length === 0) return null;
  if (!current) return ids[0];
  const index = ids.indexOf(current);
  if (key === "ArrowLeft") return ids[Math.max(0, index - 1)];
  if (key === "ArrowRight") return ids[Math.min(ids.length - 1, index + 1)];
  const cells = ids.map((id) => ({ id, rect: document.querySelector(`[data-item="${CSS.escape(id)}"]`)?.getBoundingClientRect() }));
  const from = cells[index].rect;
  if (!from) return current;
  const centerX = from.left + from.width / 2;
  const down = key === "ArrowDown";
  const candidates = cells.filter(({ rect }) => rect && (down ? rect.top > from.bottom - 2 : rect.bottom < from.top + 2));
  if (candidates.length === 0) return current;
  const nearestRowTop = down
    ? Math.min(...candidates.map(({ rect }) => rect!.top))
    : Math.max(...candidates.map(({ rect }) => rect!.top));
  const row = candidates.filter(({ rect }) => Math.abs(rect!.top - nearestRowTop) < 2);
  row.sort((a, b) => Math.abs(a.rect!.left + a.rect!.width / 2 - centerX) - Math.abs(b.rect!.left + b.rect!.width / 2 - centerX));
  return row[0].id;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: { label: string; run: () => void } }) {
  return (
    <div className="flex max-w-xs flex-col items-center gap-2 text-center">
      <p className="text-[15px] font-[650]">{title}</p>
      <p className="text-[13px] leading-relaxed text-[var(--muted)]">{body}</p>
      {action && (
        <button type="button" onClick={action.run} className="mt-2 h-8 rounded-md border border-[var(--line)] px-3 hover:bg-[var(--hover)]">
          {action.label}
        </button>
      )}
    </div>
  );
}

// 지우기는 같은 자리를 3초 안에 한 번 더 눌러야 실행한다(tastepin 삭제 확인: 제자리 두 번, 빨간 면).
function TwoStepButton({ label, armedLabel, onConfirm }: { label: string; armedLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 whitespace-nowrap ${
        armed ? "bg-[#d8383e] font-[650] text-white" : "text-[#d8383e] hover:bg-[var(--hover)] dark:text-[#ff6b70]"
      }`}
    >
      <TrashIcon size={16} />
      {armed ? armedLabel : label}
    </motion.button>
  );
}
