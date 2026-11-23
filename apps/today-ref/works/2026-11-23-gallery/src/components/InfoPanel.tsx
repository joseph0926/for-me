// 오른쪽 정보 패널(r1): 형식 배지가 붙은 미리보기, 대표 색, 이름, 메모, 태그, 별점, 색 태그와 세부 정보.
import { useState, type Dispatch, type ReactNode } from "react";

import { extensionOf, formatBytes, formatDuration, formatTaken } from "../format";
import { colorTags, countByKind, thumbSrc, type LibraryAction, type MediaItem } from "../library";
import { colorTagHex, colorTagLabels } from "./colorTags";
import { CloseIcon, HeartIcon, StarIcon, TagIcon, TrashIcon } from "./Icons";

interface InfoPanelProps {
  selection: MediaItem[];
  visible: MediaItem[];
  palette: string[] | undefined;
  allTags: string[];
  colorFilter: string | null;
  dispatch: Dispatch<LibraryAction>;
  onColorFilter: (hex: string) => void;
  onTrash: (ids: string[]) => void;
}

export function InfoPanel(props: InfoPanelProps) {
  const { selection, visible } = props;
  if (selection.length === 0) return <Summary items={visible} />;
  if (selection.length > 1) return <MultiInfo {...props} />;
  // 이름과 메모 입력칸의 초안을 항목마다 새로 시작하게 한다.
  return <SingleInfo key={selection[0].id} {...props} item={selection[0]} />;
}

function Summary({ items }: { items: MediaItem[] }) {
  const counts = countByKind(items);
  const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
  return (
    <div className="flex flex-col gap-5 p-4">
      <h3 className="text-[16px] font-[650]">이곳의 항목</h3>
      <Rows
        rows={[
          ["사진", counts.image.toLocaleString()],
          ["동영상", counts.video.toLocaleString()],
          ["GIF", counts.gif.toLocaleString()],
          ["합계 용량", formatBytes(bytes)],
        ]}
      />
    </div>
  );
}

function SingleInfo({ item, palette, allTags, colorFilter, dispatch, onColorFilter, onTrash }: InfoPanelProps & { item: MediaItem }) {
  const [name, setName] = useState(item.name);
  const [note, setNote] = useState(item.note);
  const [tagDraft, setTagDraft] = useState("");

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) setName(item.name);
    else if (trimmed !== item.name) dispatch({ type: "rename", id: item.id, name: trimmed });
  };
  const addTag = () => {
    const tag = tagDraft.trim();
    if (tag) dispatch({ type: "addTag", ids: [item.id], tag });
    setTagDraft("");
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="relative grid h-44 place-items-center overflow-hidden rounded-md bg-[var(--hover)]">
        <img src={thumbSrc(item)} alt="" className="max-h-full max-w-full object-contain" />
        <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[13px] font-[650] text-white">
          {extensionOf(item.name)}
        </span>
      </div>

      <div className="flex items-center gap-2" aria-label="대표 색">
        {palette ? (
          palette.map((hex) => (
            <button
              key={hex}
              type="button"
              title={`${hex} 색으로 거르기`}
              aria-label={`${hex} 색으로 거르기`}
              aria-pressed={colorFilter === hex}
              onClick={() => onColorFilter(hex)}
              className="size-6 rounded-full ring-1 ring-black/15 transition-transform hover:scale-110"
              style={{ background: hex }}
            />
          ))
        ) : (
          <span className="text-[13px] text-[var(--faint)]">색을 읽는 중</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          aria-label="이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setName(item.name);
              event.currentTarget.blur();
            }
          }}
          className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 font-medium outline-none focus:border-[var(--ink)]"
        />
        <textarea
          aria-label="메모"
          placeholder="메모"
          value={note}
          rows={2}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => note !== item.note && dispatch({ type: "note", id: item.id, note })}
          className="resize-none rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 leading-snug outline-none placeholder:text-[var(--faint)] focus:border-[var(--ink)]"
        />
      </div>

      <Section title="태그">
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="flex h-7 items-center gap-0.5 text-[13px] font-medium text-[var(--muted)]">
              {tag}
              <button
                type="button"
                aria-label={`${tag} 태그 빼기`}
                onClick={() => dispatch({ type: "removeTag", id: item.id, tag })}
                className="grid size-4 place-items-center rounded-full text-[var(--muted)] hover:bg-black/10 hover:text-[var(--ink)]"
              >
                <CloseIcon size={11} />
              </button>
            </span>
          ))}
          <input
            aria-label="태그 더하기"
            placeholder="+ 태그"
            list="tag-suggestions"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addTag();
            }}
            onBlur={addTag}
            className="h-7 w-24 rounded-md border border-[var(--line)] bg-transparent px-2 text-[13px] outline-none placeholder:text-[var(--faint)] focus:border-[var(--ink)]"
          />
          <datalist id="tag-suggestions">
            {allTags.filter((tag) => !item.tags.includes(tag)).map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </div>
      </Section>

      <Section title="별점과 표시">
        <div className="flex items-center justify-between">
          <Stars value={item.rating} onChange={(rating) => dispatch({ type: "patch", ids: [item.id], patch: { rating } })} />
          <button
            type="button"
            aria-pressed={item.favorite}
            aria-label="즐겨찾기"
            onClick={() => dispatch({ type: "toggleFavorite", ids: [item.id] })}
            className={`grid size-7 place-items-center rounded-md hover:bg-[var(--hover)] ${item.favorite ? "text-[#d8383e] dark:text-[#ff6b70]" : "text-[var(--muted)]"}`}
          >
            <HeartIcon size={17} filled={item.favorite} />
          </button>
        </div>
        <ColorTagPicker value={item.colorTag} onChange={(colorTag) => dispatch({ type: "patch", ids: [item.id], patch: { colorTag } })} />
      </Section>

      <Section title="정보">
        <Rows
          rows={[
            ["크기", `${item.width} x ${item.height}px`],
            ["용량", formatBytes(item.bytes)],
            ["형식", extensionOf(item.name)],
            ...(item.duration !== undefined ? [["길이", formatDuration(item.duration)] as [string, string]] : []),
            ["찍은 날", formatTaken(item.takenAt)],
            ["폴더", item.folder],
          ]}
        />
        {item.credit && (
          <a href={item.credit.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[13px] text-[var(--muted)] underline-offset-2 hover:underline">
            사진: {item.credit.author} (Unsplash)
          </a>
        )}
      </Section>

      {!item.trashed && (
        <button
          type="button"
          onClick={() => onTrash([item.id])}
          className="flex h-8 items-center justify-center gap-2 rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
        >
          <TrashIcon size={16} />
          휴지통으로 이동
        </button>
      )}
    </div>
  );
}

// 휴지통과 즐겨찾기 일괄 작업은 격자 아래 막대(SelectionBar)가 맡고, 여기서는 별점, 색 태그, 태그를 함께 바꾼다.
function MultiInfo({ selection, allTags, dispatch }: InfoPanelProps) {
  const [tagDraft, setTagDraft] = useState("");
  const ids = selection.map((item) => item.id);
  const bytes = selection.reduce((sum, item) => sum + item.bytes, 0);
  const counts = countByKind(selection);
  const allFavorite = selection.every((item) => item.favorite);
  const addTag = () => {
    const tag = tagDraft.trim();
    if (tag) dispatch({ type: "addTag", ids, tag });
    setTagDraft("");
  };
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="grid h-40 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-md">
        {selection.slice(0, 4).map((item, index) => (
          <img
            key={item.id}
            src={thumbSrc(item)}
            alt=""
            className={`size-full object-cover ${selection.length === 1 || (selection.length === 3 && index === 0) ? "row-span-2" : ""} ${selection.length === 2 ? "row-span-2" : ""}`}
          />
        ))}
      </div>
      <div>
        <p className="text-[15px] font-[650]">{selection.length}개 선택</p>
        <p className="text-[13px] text-[var(--muted)]">
          {[counts.image && `사진 ${counts.image}`, counts.video && `동영상 ${counts.video}`, counts.gif && `GIF ${counts.gif}`].filter(Boolean).join(", ")}, {formatBytes(bytes)}
        </p>
      </div>
      <Section title="한꺼번에 바꾸기">
        <div className="flex items-center justify-between">
          <Stars value={0} onChange={(rating) => dispatch({ type: "patch", ids, patch: { rating } })} />
          <button
            type="button"
            aria-label={allFavorite ? "즐겨찾기에서 빼기" : "모두 즐겨찾기"}
            aria-pressed={allFavorite}
            onClick={() => dispatch({ type: "toggleFavorite", ids })}
            className={`grid size-7 place-items-center rounded-md hover:bg-[var(--hover)] ${allFavorite ? "text-[#d8383e] dark:text-[#ff6b70]" : "text-[var(--muted)]"}`}
          >
            <HeartIcon size={17} filled={allFavorite} />
          </button>
        </div>
        <ColorTagPicker value={null} onChange={(colorTag) => dispatch({ type: "patch", ids, patch: { colorTag } })} />
        <label className="flex h-8 items-center gap-2 rounded-md border border-[var(--line)] px-2.5 focus-within:border-[var(--accent)]">
          <TagIcon size={15} className="text-[var(--muted)]" />
          <input
            placeholder="모두에 태그 더하기"
            list="multi-tag-suggestions"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addTag();
            }}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--faint)]"
          />
          <datalist id="multi-tag-suggestions">
            {allTags.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </label>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 pt-2">
      <h3 className="text-[14px] font-[650]">{title}</h3>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-[var(--muted)]">{label}</dt>
          <dd className="text-right tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex" role="radiogroup" aria-label="별점" onPointerLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`별 ${star}개`}
          onPointerEnter={() => setHover(star)}
          // 이미 고른 별을 다시 누르면 별점을 지운다.
          onClick={() => onChange(value === star ? 0 : star)}
          className={`grid size-6 place-items-center ${star <= shown ? "text-[#d99a26]" : "text-[var(--faint)]"}`}
        >
          <StarIcon size={17} filled={star <= shown} />
        </button>
      ))}
    </div>
  );
}

export function ColorTagPicker({ value, onChange }: { value: MediaItem["colorTag"]; onChange: (value: MediaItem["colorTag"]) => void }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="색 태그">
      {colorTags.map((tag) => (
        <button
          key={tag}
          type="button"
          role="radio"
          aria-checked={value === tag}
          aria-label={`${colorTagLabels[tag]} 색 태그`}
          onClick={() => onChange(value === tag ? null : tag)}
          className={`size-4 rounded-full transition-transform hover:scale-115 ${value === tag ? "ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--panel)]" : ""}`}
          style={{ background: colorTagHex[tag] }}
        />
      ))}
    </div>
  );
}
