import { blog, categories, type Category } from "../data";
import { hrefFor } from "../route";
import { Icon } from "./Icon";

export function SiteHeader({ category, onSearch, onSubscribe }: { category: Category | null; onSearch: () => void; onSubscribe: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-8">
        <a href={hrefFor({ page: "home", category: null })} className="shrink-0 text-[17px] font-extrabold tracking-tight">
          {blog.name}
        </a>
        <nav aria-label="분류" className="ml-auto hidden items-center gap-1 sm:flex">
          {categories.map((entry) => (
            <a
              key={entry}
              href={hrefFor({ page: "home", category: entry })}
              aria-current={entry === category ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-[14px] font-medium transition ${entry === category ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {entry}
            </a>
          ))}
        </nav>
        <button type="button" onClick={onSubscribe} className="ml-auto h-9 shrink-0 rounded-lg bg-accent px-3.5 text-[14px] font-semibold text-white sm:ml-2">
          구독하기
        </button>
        <button type="button" onClick={onSearch} aria-label="글 검색" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
          <Icon name="search" />
        </button>
      </div>
    </header>
  );
}
