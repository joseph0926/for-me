import { useEffect, useState, type ReactNode } from "react";

import { formatDate, posts, type Post } from "../data";
import { hrefFor } from "../route";
import { Icon } from "./Icon";

function matches(post: Post, query: string): boolean {
  const target = `${post.title} ${post.summary} ${post.category}`.toLowerCase();
  return target.includes(query.toLowerCase());
}

function highlight(text: string, query: string): ReactNode {
  if (query === "") return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-accent-soft text-accent">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const trimmed = query.trim();
  const results = trimmed === "" ? [] : posts.filter((post) => matches(post, trimmed));
  const active = Math.min(activeIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const open = (post: Post) => {
    window.location.hash = hrefFor({ page: "post", slug: post.slug });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="글 검색" className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="size-5 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex(Math.min(active + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex(Math.max(active - 1, 0));
              } else if (event.key === "Enter" && results[active]) {
                open(results[active]);
              }
            }}
            placeholder="제목, 내용, 분류로 찾기"
            aria-label="검색어"
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
          <button type="button" onClick={onClose} aria-label="검색 닫기" className="grid size-9 place-items-center rounded-full text-muted hover:bg-sunken">
            <Icon name="close" className="size-4" />
          </button>
        </div>
        {trimmed === "" ? null : results.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-muted">
            ‘{trimmed}’ 검색 결과가 없습니다. 더 짧은 낱말로 찾아보세요.
          </p>
        ) : (
          <ul className="max-h-[50vh] overflow-y-auto py-2" role="listbox" aria-label="검색 결과">
            {results.map((post, index) => (
              <li key={post.slug} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => open(post)}
                  className={`block w-full px-5 py-3 text-left ${index === active ? "bg-sunken" : ""}`}
                >
                  <span className="block text-[15px] font-semibold">{highlight(post.title, trimmed)}</span>
                  <span className="mt-0.5 line-clamp-1 block text-[13px] text-muted">{highlight(post.summary, trimmed)}</span>
                  <span className="mt-1 block text-[12px] text-muted">
                    {post.category}, {formatDate(post.date)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
