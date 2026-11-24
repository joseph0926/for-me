import { useLayoutEffect, useRef } from "react";
import { StudioHeader } from "./Studio";

type Props = {
  blob: Blob;
  name: string;
  width: number;
  height: number;
  onOpen: () => void;
};

export function GifViewer({ blob, name, width, height, onOpen }: Props) {
  const player = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const url = URL.createObjectURL(blob);
    player.current!.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <section className="studio view-studio" aria-label="GIF 보기">
      <StudioHeader name={name} onOpen={onOpen} />
      <div className="matte"><div className="workspace">
        <img className="gif-player" ref={player} alt={name} />
      </div></div>
      <footer className="studio-status">
        <span className="status-file">{name}</span>
        <span>GIF 보기</span>
        <span className="dimensions">{width} × {height} px</span>
      </footer>
    </section>
  );
}
