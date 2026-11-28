// 음반 목록: 두 열 커버와 제목, 아티스트.
import { useRef } from "react";

import { CoverArtwork } from "../components/Cover";
import { TopBar, useHiddenUnderBar } from "../components/TopBar";
import { albums } from "../data";
import { useUi } from "../ui";

export function Albums() {
  const ui = useUi();
  const top = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scrolled = useHiddenUnderBar(top, 0);
  const titlePassed = useHiddenUnderBar(heading);

  return (
    <div className="pb-6">
      <div ref={top} aria-hidden="true" className="h-px" />
      <TopBar title="음반" scrolled={scrolled} showTitle={titlePassed} />
      <h1 ref={heading} className="title px-5 pb-4 text-[28px]">
        음반
      </h1>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 px-5">
        {albums.map((album) => (
          <li key={album.id}>
            <button type="button" onClick={() => ui.open({ kind: "album", id: album.id })} className="block w-full text-left">
              <CoverArtwork art={album.cover} className="aspect-square w-full rounded-work" />
              <span className="mt-2 block truncate text-[15px] font-medium">{album.title}</span>
              <span className="block truncate text-sm text-muted">{album.artist}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
