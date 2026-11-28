// 앨범. 기기 폴더의 정사각 줄과 2열 앨범 카드, 카드 아래 "이름 • 개수"(r4).
import { Icon } from "../components/Icon";
import { ScreenHeader } from "../components/ScreenHeader";
import { resolveCollection, type Collection } from "../collections";
import { deviceFolders } from "../data";
import { useGallery } from "../gallery";
import { useUi } from "../ui";

export function Albums() {
  const gallery = useGallery();
  const ui = useUi();
  const devices = deviceFolders.map((folder) => resolveCollection(`device:${folder.source}`, gallery)!);
  const albums = ["favorites", ...gallery.albums.map((album) => album.id)].map((id) => resolveCollection(id, gallery)!);
  const trash = resolveCollection("trash", gallery)!;

  return (
    <div className="scroll-area h-full pb-8">
      <ScreenHeader
        title="앨범"
        trailing={
          <button
            type="button"
            aria-label="새 앨범"
            className="grid size-8 place-items-center rounded-work bg-sunken"
            onClick={() => ui.openSheet({ kind: "new-album", ids: [] })}
          >
            <Icon name="plus" size={20} />
          </button>
        }
      />

      <section className="mt-2">
        <h2 className="px-4 text-[17px] font-bold">기기</h2>
        <div className="scroll-area mt-2.5 flex gap-2.5 overflow-x-auto px-4 pb-1">
          {devices.map((folder) => (
            <button key={folder.id} type="button" className="w-[96px] shrink-0 text-left" onClick={() => ui.openAlbum(folder.id)}>
              <Cover collection={folder} />
              {/* 기기 폴더도 아래 앨범 카드와 같은 "이름 • 개수" 한 줄로 쓴다 */}
              <CountLabel name={folder.name} count={folder.items.length} />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="px-4 text-[17px] font-bold">내 앨범</h2>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-4 px-4">
          {albums.map((album) => (
            <button key={album.id} type="button" className="min-w-0 text-left" onClick={() => ui.openAlbum(album.id)}>
              <Cover collection={album} />
              <CountLabel name={album.name} count={album.items.length} />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 px-4">
        <button
          type="button"
          className="flex h-12 w-full items-center gap-3 text-left"
          onClick={() => ui.openAlbum("trash")}
        >
          <Icon name="trash" size={20} className="text-muted" />
          <span className="flex-1 text-[15px] font-semibold">최근 삭제됨</span>
          <span className="num text-[14px] text-muted">{trash.items.length}</span>
          <Icon name="chevron" size={18} className="text-faint" />
        </button>
      </section>
    </div>
  );
}

function CountLabel({ name, count }: { name: string; count: number }) {
  return (
    <span className="num mt-1.5 block truncate text-[14px]">
      <span className="font-semibold">{name}</span>
      <span className="text-muted"> • {count}</span>
    </span>
  );
}

function Cover({ collection }: { collection: Collection }) {
  const first = collection.items[0];
  return (
    <span className="block aspect-square overflow-hidden rounded-work bg-sunken">
      {first ? (
        <img src={first.thumb} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full place-items-center text-faint">
          <Icon name="albums" size={28} />
        </span>
      )}
    </span>
  );
}
