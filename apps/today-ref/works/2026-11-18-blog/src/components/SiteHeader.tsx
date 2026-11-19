import { blog, categories, type Category } from "../data";
import { hrefFor } from "../route";
import { Icon } from "./Icon";

export function SiteHeader({ category, onSearch, onSubscribe }: { category: Category | null; onSearch: () => void; onSubscribe: () => void }) {
  return (
    <header className="nav border-b border-line bg-surface">
      <div className="wrap flex h-14 items-center gap-2 sm:gap-4">
        <a href={hrefFor({ page: "home", category: null })} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold">
          <span className="drawer-mark" aria-hidden="true" />{blog.name}
        </a>
        <nav aria-label="분류" className="ml-auto hidden items-center gap-1 sm:flex">
          {categories.map((entry) => (
            <a
              key={entry}
              href={hrefFor({ page: "home", category: entry })}
              aria-current={entry === category ? "page" : undefined}
              className={`inline-flex min-h-11 items-center px-3 text-[14px] font-medium transition ${entry === category ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {entry}
            </a>
          ))}
        </nav>
        <button type="button" onClick={onSubscribe} className="ml-auto h-11 shrink-0 px-2 text-[14px] font-semibold text-ink hover:underline sm:ml-2">
          구독하기
        </button>
        <button type="button" onClick={onSearch} aria-label="글 검색" className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
          <Icon name="search" />
        </button>
      </div>
    </header>
  );
}
