import { useEffect, useRef } from "react";

export function CoverArt({ slug, className = "", thumbnail = false, develop = false, sizes }: {
  slug: string;
  className?: string;
  thumbnail?: boolean;
  develop?: boolean;
  sizes?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = frame.current;
    if (!develop || !host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    Promise.all([
      import("../vendor/taste/moments/lib.js"),
      import("../vendor/taste/moments/picture-develops/moment.js"),
    ])
      .then(([lib, moment]) => {
        if (!disposed) destroy = moment.default(host, { look: "film" }, lib).destroy;
      })
      .catch(() => host.classList.add("mo-safe"));
    return () => {
      disposed = true;
      destroy?.();
    };
  }, [develop, slug]);

  return (
    <div ref={frame} data-moment={develop ? "picture-develops" : undefined} className={`relative overflow-hidden ${className}`}>
      <img
        src={`/images/${slug}${thumbnail ? "-thumb" : ""}.webp`}
        srcSet={thumbnail ? `/images/${slug}-128.webp 128w, /images/${slug}-thumb.webp 400w` : `/images/${slug}-thumb.webp 400w, /images/${slug}.webp 1280w`}
        sizes={sizes ?? (thumbnail ? "(max-width: 639px) 64px, 128px" : "(max-width: 760px) 100vw, (max-width: 1000px) 70vw, 800px")}
        width={thumbnail ? 400 : 1280} height={thumbnail ? 300 : 960}
        loading={thumbnail ? "lazy" : undefined}
        fetchPriority={develop ? "high" : undefined}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}
