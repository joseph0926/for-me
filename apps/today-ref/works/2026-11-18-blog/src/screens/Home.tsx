import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";
import { CategoryBadge, SeriesBadge } from "../components/PostMeta";
import { SubscribeForm } from "../components/SubscribeForm";
import { blog, categories, formatDate, posts, series, seriesPosts, type Category, type Post } from "../data";
import { hrefFor } from "../route";

const byNewest = [...posts].sort((a, b) => b.date.localeCompare(a.date));
const featured = byNewest.filter((post) => post.featured);
const popular = [...posts].sort((a, b) => b.views - a.views).slice(0, 3);

export function Home({
  category,
  subscribedEmail,
  onSubscribe,
}: {
  category: Category | null;
  subscribedEmail: string | null;
  onSubscribe: (email: string) => void;
}) {
  const visible = category ? byNewest.filter((post) => post.category === category) : byNewest;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      {category === null ? (
        <>
          <AuthorIntro />
          <Featured />
        </>
      ) : (
        <div className="pt-10 sm:pt-14">
          <p className="text-[14px] font-semibold text-accent">분류</p>
          <h1 className="mt-1 text-3xl font-extrabold">{category}</h1>
        </div>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <section aria-labelledby="all-posts">
          <h2 id="all-posts" className="text-2xl font-extrabold">
            {category ? `${category} 글 ${visible.length}편` : "전체 글"}
          </h2>
          <nav aria-label="분류 고르기" className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {[null, ...categories].map((entry) => {
              const selected = entry === category;
              return (
                <a
                  key={entry ?? "all"}
                  href={hrefFor({ page: "home", category: entry })}
                  aria-current={selected ? "page" : undefined}
                  className={`h-9 shrink-0 rounded-full border px-4 text-[14px] leading-[34px] font-medium transition ${
                    selected ? "border-ink bg-ink text-surface" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {entry ?? "전체"}
                </a>
              );
            })}
          </nav>
          <ul className="mt-4">
            {visible.map((post) => (
              <PostRow key={post.slug} post={post} />
            ))}
          </ul>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <PopularBox />
          <SeriesBox />
          <SubscribeForm subscribedEmail={subscribedEmail} onSubscribe={onSubscribe} />
        </aside>
      </div>
    </main>
  );
}

function AuthorIntro() {
  return (
    <section className="flex flex-col items-center pt-12 text-center sm:pt-16">
      <span className="grid size-20 place-items-center rounded-full bg-[conic-gradient(from_200deg,#f4a261,#e76f51,#c2410c,#f4a261)] text-2xl font-extrabold text-white shadow-lg">
        서
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">{blog.author}</h1>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-body">{blog.intro}</p>
    </section>
  );
}

function Featured() {
  const [index, setIndex] = useState(0);
  const post = featured[index];
  const move = (step: number) => setIndex((current) => (current + step + featured.length) % featured.length);

  return (
    <section aria-label="대표 글" className="mt-12 grid items-center gap-6 md:grid-cols-[1fr_1.15fr] md:gap-12">
      <div className="order-2 md:order-1">
        <AnimatePresence mode="wait">
          <motion.div key={post.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="flex flex-wrap gap-1.5">
              <CategoryBadge post={post} />
              <SeriesBadge post={post} />
            </div>
            <a href={hrefFor({ page: "post", slug: post.slug })} className="mt-3 block text-[26px] leading-snug font-extrabold hover:underline sm:text-[30px]">
              {post.title}
            </a>
            <p className="mt-3 text-[15px] leading-relaxed text-body">{post.summary}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="이전 대표 글" className="grid size-11 place-items-center rounded-full bg-sunken text-muted hover:text-ink">
            <Icon name="back" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="다음 대표 글" className="grid size-11 place-items-center rounded-full bg-sunken text-muted hover:text-ink">
            <Icon name="next" />
          </button>
          <span className="ml-2 text-[13px] text-muted tabular-nums">
            {index + 1} / {featured.length}
          </span>
        </div>
      </div>
      <a href={hrefFor({ page: "post", slug: post.slug })} className="order-1 block md:order-2" tabIndex={-1} aria-hidden="true">
        <CoverArt art={post.cover} className="aspect-[16/9] rounded-3xl" />
      </a>
    </section>
  );
}

function PostRow({ post }: { post: Post }) {
  return (
    <li className="border-b border-line last:border-none">
      <a href={hrefFor({ page: "post", slug: post.slug })} className="group flex gap-5 py-7">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <CategoryBadge post={post} />
            <SeriesBadge post={post} />
          </div>
          <h3 className="mt-2.5 text-[18px] leading-snug font-bold group-hover:underline">{post.title}</h3>
          <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-body">{post.summary}</p>
          <p className="mt-3 text-[13px] text-muted">{formatDate(post.date)}</p>
        </div>
        <CoverArt art={post.cover} className="hidden aspect-[4/3] w-36 shrink-0 self-center rounded-2xl sm:block" />
      </a>
    </li>
  );
}

function PopularBox() {
  return (
    <section className="rounded-2xl bg-sunken p-5">
      <h2 className="text-[15px] font-bold text-muted">인기 있는 글</h2>
      <ol className="mt-4 space-y-4">
        {popular.map((post, index) => (
          <li key={post.slug}>
            <a href={hrefFor({ page: "post", slug: post.slug })} className="group flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface text-[13px] font-bold text-accent">{index + 1}</span>
              <span className="min-w-0">
                <span className="block text-[14px] leading-snug font-semibold group-hover:underline">{post.title}</span>
                <span className="mt-1 block text-[12px] text-muted">{formatDate(post.date)}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SeriesBox() {
  return (
    <>
      {series.map((entry) => {
        const parts = seriesPosts(entry.id);
        return (
          <section key={entry.id} className="rounded-2xl border border-line p-5">
            <div className="flex items-center gap-2">
              {entry.ongoing ? <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-surface">연재 중</span> : null}
              <h2 className="text-[15px] font-bold">{entry.name}</h2>
            </div>
            <ol className="mt-3 space-y-2">
              {parts.map((post) => (
                <li key={post.slug}>
                  <a href={hrefFor({ page: "post", slug: post.slug })} className="flex gap-2 text-[14px] text-body hover:text-ink hover:underline">
                    <span className="w-8 shrink-0 text-muted tabular-nums">{post.series?.part}화</span>
                    <span className="min-w-0 truncate">{post.title.replace(/^.*?:\s*/, "")}</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
