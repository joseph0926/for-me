// 재생 중 자막을 고르는 시트. 영상에 들어 있는 자막, 외부 SRT, 끄기 중 하나를 고른다.
import { motion } from "motion/react";

import { Icon } from "../components/Icon";
import type { SubtitleTrack } from "../data";

// tastepin 드로어 예외: 가장자리에서 올라오는 시트는 스프링 없이 300ms 감속 곡선으로 열고 같은 길로 닫는다.
const SHEET = { duration: 0.3, ease: [0.215, 0.61, 0.355, 1] } as const;

export function SubtitleSheet({
  tracks,
  selectedId,
  hasExternal,
  onSelect,
  onLoadExternal,
  onClose,
}: {
  tracks: SubtitleTrack[];
  selectedId: string | null;
  hasExternal: boolean;
  onSelect: (trackId: string | null) => void;
  onLoadExternal: () => void;
  onClose: () => void;
}) {
  const options: { id: string | null; label: string; caption?: string }[] = [
    { id: null, label: "끄기" },
    ...tracks.map((track) => ({
      id: track.id,
      label: track.label,
      caption: track.source === "embedded" ? "영상에 포함" : "외부 SRT",
    })),
  ];

  return (
    <>
      <motion.button
        type="button"
        aria-label="자막 선택 닫기"
        className="pointer-events-auto absolute inset-0 bg-black/50"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={SHEET}
      />
      <motion.div
        role="dialog"
        aria-label="자막"
        className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto max-h-[80%] max-w-[420px] overflow-y-auto rounded-t-md bg-raised px-2 pt-3 pb-4"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={SHEET}
      >
        <div className="mb-2 flex items-center justify-between px-3">
          <h2 className="text-[16px] font-bold">자막</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="icon-btn size-9 text-muted">
            <Icon name="close" size={20} />
          </button>
        </div>
        <ul>
          {options.map((option) => {
            const selected = option.id === selectedId;
            return (
              <li key={option.id ?? "off"}>
                <button
                  type="button"
                  onClick={() => onSelect(option.id)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left active:bg-raised-2"
                  aria-pressed={selected}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] ${selected ? "font-semibold text-accent" : ""}`}>{option.label}</span>
                    {option.caption && <span className="block text-[12px] text-muted">{option.caption}</span>}
                  </span>
                  {selected && <Icon name="check" size={20} className="shrink-0 text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
        {/* 자막 목록과 파일 열기는 선 대신 여백으로 나눈다. */}
        {!hasExternal && (
          <button
            type="button"
            onClick={onLoadExternal}
            className="mt-4 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] text-ink active:bg-raised-2"
          >
            <Icon name="file" size={20} className="text-muted" />
            외부 SRT 열기
          </button>
        )}
      </motion.div>
    </>
  );
}
