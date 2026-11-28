// 선택한 사진에 대한 시트: 앨범에 추가, 새 앨범, 영구 삭제 확인.
import { useState } from "react";

import { itemById } from "../data";
import { useGallery } from "../gallery";
import type { SheetRequest } from "../ui";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

export function Sheets({
  request,
  onClose,
  onDone,
  onSwitch,
}: {
  request: SheetRequest;
  onClose: () => void;
  // 시트의 일을 마쳤을 때. 알림 문구와 되돌릴 동작을 App이 띄운다.
  onDone: (message: string, after?: { openAlbum?: string; purged?: string[] }) => void;
  onSwitch: (next: SheetRequest) => void;
}) {
  const gallery = useGallery();

  if (request.kind === "add-to-album") {
    return (
      <Sheet title={`${request.ids.length}장을 앨범에 추가`} onClose={onClose}>
        <button type="button" className="flex h-14 w-full items-center gap-3 px-5 text-left" onClick={() => onSwitch({ kind: "new-album", ids: request.ids })}>
          <span className="grid size-10 place-items-center rounded-work bg-sunken text-accent">
            <Icon name="plus" size={20} />
          </span>
          <span className="text-[15px] font-semibold text-accent">새 앨범</span>
        </button>
        {gallery.albums.map((album) => {
          const cover = album.items.find(gallery.isVisible);
          const count = album.items.filter(gallery.isVisible).length;
          return (
            <button
              key={album.id}
              type="button"
              className="flex h-14 w-full items-center gap-3 px-5 text-left"
              onClick={() => {
                gallery.dispatch({ type: "add-to-album", albumId: album.id, ids: request.ids });
                onDone(`'${album.name}' 앨범에 ${request.ids.length}장 추가했습니다`);
              }}
            >
              <span className="size-10 overflow-hidden rounded-work bg-sunken">
                {cover && <img src={itemById.get(cover)!.thumb} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="flex-1 text-[15px] font-semibold">{album.name}</span>
              <span className="num text-[14px] text-muted">{count}</span>
            </button>
          );
        })}
      </Sheet>
    );
  }

  if (request.kind === "new-album") {
    return <NewAlbum ids={request.ids} onClose={onClose} onDone={onDone} />;
  }

  return (
    <Sheet title="영구 삭제" onClose={onClose}>
      <p className="px-5 text-[15px] leading-relaxed text-muted">
        {request.ids.length}개 항목을 영구 삭제합니다. 삭제하면 되살릴 수 없습니다.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 px-5">
        <button type="button" className="h-11 rounded-work bg-sunken text-[15px] font-semibold" onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="h-11 rounded-work bg-danger text-[15px] font-semibold text-danger-ink"
          onClick={() => {
            gallery.dispatch({ type: "purge", ids: request.ids });
            onDone(`${request.ids.length}개 항목을 영구 삭제했습니다`, { purged: request.ids });
          }}
        >
          영구 삭제
        </button>
      </div>
    </Sheet>
  );
}

function NewAlbum({
  ids,
  onClose,
  onDone,
}: {
  ids: string[];
  onClose: () => void;
  onDone: (message: string, after?: { openAlbum?: string }) => void;
}) {
  const gallery = useGallery();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const taken = gallery.albums.some((album) => album.name === trimmed);

  function create() {
    if (trimmed === "" || taken) return;
    const id = `a-${crypto.randomUUID().slice(0, 8)}`;
    gallery.dispatch({ type: "create-album", id, name: trimmed, ids });
    onDone(ids.length > 0 ? `'${trimmed}' 앨범을 만들고 ${ids.length}장 넣었습니다` : `'${trimmed}' 앨범을 만들었습니다`, { openAlbum: id });
  }

  return (
    <Sheet title="새 앨범" onClose={onClose}>
      <form
        className="px-5"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <input
          // 시트가 올라오는 움직임을 건너뛰지 않도록 스크롤 없이 초점만 준다
          ref={(element) => element?.focus({ preventScroll: true })}
          value={name}
          maxLength={30}
          placeholder="앨범 이름"
          aria-label="앨범 이름"
          className="h-11 w-full rounded-work bg-sunken px-3 text-[15px] outline-none placeholder:text-faint focus-visible:outline-1 focus-visible:outline-accent"
          onChange={(event) => setName(event.target.value)}
        />
        <p className="mt-1.5 h-5 text-[13px] text-danger">{taken ? "같은 이름의 앨범이 있습니다" : ""}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="h-11 rounded-work bg-sunken text-[15px] font-semibold" onClick={onClose}>
            취소
          </button>
          <button type="submit" disabled={trimmed === "" || taken} className="h-11 rounded-work bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-40">
            만들기
          </button>
        </div>
      </form>
    </Sheet>
  );
}
