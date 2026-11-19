import type { Pack } from "../data";

export function PackArt({ pack, className = "" }: { pack: Pack; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-panel ${className}`}>
      <img
        src={`/images/packs/${pack.id}.webp`}
        srcSet={`/images/packs/${pack.id}-480.webp 480w, /images/packs/${pack.id}.webp 900w`}
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 395px"
        loading="lazy"
        width={900}
        height={507}
        alt=""
        className={`pack-photo absolute inset-0 size-full object-cover ${pack.id === "rare-trio" ? "" : "grayscale"}`}
      />
      <span className="absolute top-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold tabular text-white">
        {pack.size}장
      </span>
    </div>
  );
}
