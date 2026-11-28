// 앨범 하나의 격자. 휴지통도 같은 화면에서 열고, 선택하면 복구와 영구 삭제를 한다.
import { EmptyState } from "../components/EmptyState";
import { Grid } from "../components/Grid";
import { ScreenHeader } from "../components/ScreenHeader";
import { resolveCollection } from "../collections";
import { countLabel } from "../format";
import { useGallery } from "../gallery";
import { useUi } from "../ui";

export function AlbumDetail({ collectionId, onBack }: { collectionId: string; onBack: () => void }) {
  const gallery = useGallery();
  const ui = useUi();
  const collection = resolveCollection(collectionId, gallery);
  if (!collection) return null;

  const scope = `album:${collection.id}`;
  const videos = collection.items.filter((item) => item.kind === "video").length;
  const list = collection.items.map((item) => item.id);

  return (
    <div className="scroll-area h-full pb-8">
      <ScreenHeader
        title={collection.name}
        subtitle={countLabel(collection.items.length - videos, videos)}
        scope={scope}
        canSelect={collection.items.length > 0}
        onBack={onBack}
      />
      {collection.items.length === 0 ? (
        collection.userAlbum ? (
          <EmptyState icon="albumAdd" text="보관함에서 사진을 골라 이 앨범을 채우세요" action={{ label: "사진 고르기", onClick: ui.pickFromLibrary }} />
        ) : (
          <EmptyState icon={collection.trash ? "trash" : "albums"} text={collection.trash ? "최근 삭제한 항목이 없습니다" : "항목이 없습니다"} />
        )
      ) : (
        <Grid items={collection.items} scope={scope} list={list} trash={collection.trash} />
      )}
    </div>
  );
}
