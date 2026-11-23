// 사진 아래 필터 썸네일 줄(r5). 썸네일은 지금 자르기와 조정을 그대로 둔 채 필터만 바꿔 그린다.
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import type { Size } from "../editor/geometry";
import { render } from "../editor/render";
import { filterPresets, type EditState } from "../editor/state";

interface FilterStripProps {
  image: HTMLImageElement;
  source: Size;
  edit: EditState;
  onPick: (id: string) => void;
}

const thumbHeight = 64;

export function FilterStrip({ image, source, edit, onPick }: FilterStripProps) {
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto bg-[var(--canvas)] px-4 pt-2 pb-3 thin-scroll" role="radiogroup" aria-label="필터">
      {filterPresets.map((preset) => (
        <FilterThumb key={preset.id} id={preset.id} label={preset.label} image={image} source={source} edit={edit} selected={edit.filter.id === preset.id} onPick={onPick} />
      ))}
    </div>
  );
}

function FilterThumb({ id, label, image, source, edit, selected, onPick }: { id: string; label: string; selected: boolean } & Omit<FilterStripProps, "onPick"> & { onPick: (id: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // 표시와 필터 강도는 썸네일에 넣지 않는다. 나머지 편집이 바뀔 때만 다시 그린다.
  const look = JSON.stringify({ ...edit, marks: [], filter: null });
  useEffect(() => {
    if (!canvas.current) return;
    const preview: EditState = { ...JSON.parse(look), marks: [], filter: { id, amount: 100 } };
    const crop = preview.crop ?? null;
    const height = crop ? crop.h : preview.rotation % 180 === 0 ? source.height : source.width;
    render(canvas.current, image, source, preview, { scale: (thumbHeight * 2) / height });
  }, [look, id, image, source]);

  return (
    <button type="button" role="radio" aria-checked={selected} onClick={() => onPick(id)} className="group flex shrink-0 flex-col items-center gap-1">
      <span className="relative block overflow-hidden rounded-[4px]" style={{ height: thumbHeight }}>
        <canvas ref={canvas} className="block h-full w-auto" />
        {selected && <motion.span layoutId="filter-selected" className="absolute inset-0 rounded-[4px] ring-2 ring-white ring-inset" transition={{ duration: 0.2 }} />}
      </span>
      <span className={`text-[13px] ${selected ? "font-[650] text-white" : "text-white/60 group-hover:text-white/90"}`}>{label}</span>
    </button>
  );
}
