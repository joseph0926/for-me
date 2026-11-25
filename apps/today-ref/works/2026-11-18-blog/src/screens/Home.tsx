import { CoverArt } from "../components/CoverArt";
import { CategoryBadge, SeriesBadge } from "../components/PostMeta";
import { SubscribeForm } from "../components/SubscribeForm";
import { blog, categories, posts, series, seriesPosts, type Category, type Post } from "../data";
import { hrefFor } from "../route";

const byNewest = [...posts].sort((a, b) => b.date.localeCompare(a.date));
const featured = byNewest.filter((post) => post.featured);
const popular = [...posts].sort((a, b) => b.views - a.views).slice(0, 3);
const ongoingSeries = series.find((entry) => entry.ongoing);
const latestPart = ongoingSeries ? seriesPosts(ongoingSeries.id).at(-1)?.series?.part : undefined;

function dotDate(date: string): string {
  return date.replaceAll("-", ".");
}

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
    <main id="main-content" tabIndex={-1}>
      {category === null && <Featured />}
      <section className="archive" aria-labelledby="all-posts">
        <div className="wrap archive-grid">
          <div>
            {category ? <h1 id="all-posts" className="section-title">{category}<sup>{visible.length}편</sup></h1>
              : <h2 id="all-posts" className="section-title">전체 글<sup>{visible.length}편</sup></h2>}
            <nav aria-label="분류 고르기" className="mt-3 flex flex-wrap gap-3 border-b border-line">
              {[null, ...categories].map((entry) => {
                const selected = entry === category;
                return (
                  <a
                    key={entry ?? "all"}
                    href={hrefFor({ page: "home", category: entry })}
                    aria-current={selected ? "page" : undefined}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center border-b-2 text-sm font-semibold ${
                      selected ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
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
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <PopularBox />
            <SeriesBox />
            <SubscribeForm subscribedEmail={subscribedEmail} onSubscribe={onSubscribe} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function Featured() {
  const [lead, ...otherFeatured] = featured;
  if (!lead) return null;
  const leadHref = hrefFor({ page: "post", slug: lead.slug });
  const seriesName = lead.series && series.find((item) => item.id === lead.series?.id)?.name;
  return (
    <section className="edition hero" data-enter aria-labelledby="blog-name">
      <div className="wrap edition-page">
        <div className="masthead">
          <h1 id="blog-name" className="sr-only">{blog.name}</h1>
          <img src="/images/author.webp" width="52" height="52" alt="" />
          <div>
            <p className="intro"><strong>{blog.author}</strong>{blog.introAfterName}</p>
            <dl className="facts">
              <div><dt>글</dt><dd>{posts.length}편</dd></div>
              <div><dt>연재</dt><dd>{ongoingSeries && latestPart ? `${ongoingSeries.name} ${latestPart}화` : "없음"}</dd></div>
              <div><dt>최근</dt><dd className="mono">{dotDate(byNewest[0]?.date ?? "")}</dd></div>
            </dl>
          </div>
        </div>
        <div className="lead-story">
          <p className="side-label">대표 글</p>
          <a href={leadHref} className="lead-photo hero__media" aria-label={lead.title}>
            <CoverArt slug={lead.slug} develop className="h-full" />
          </a>
          <div className="lead-copy">
            <div className="story-kicker">{seriesName && lead.series ? `${seriesName} ${lead.series.part}화` : lead.category}</div>
            <a className="lead-title" href={leadHref}>
              {lead.series ? lead.title.replace(/^.*?:\s*/, "") : lead.title}
              {lead === byNewest[0] ? <span className="new-mark">*새 글</span> : null}
            </a>
            <p>{lead.summary}</p>
            <a className="btn read-link" href={leadHref}>글 읽기 <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="other-stories" aria-label="다른 대표 글">
          {otherFeatured.map((post) => (
            <a key={post.slug} href={hrefFor({ page: "post", slug: post.slug })}>
              <span>{post.category}</span><strong>{post.title}</strong><i aria-hidden="true">↗</i>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function PostRow({ post }: { post: Post }) {
  return (
    <li className="post-row">
      <a href={hrefFor({ page: "post", slug: post.slug })} className="group flex items-center gap-4 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <CategoryBadge post={post} />
            <SeriesBadge post={post} />
          </div>
          <h3 className="mt-2.5 article-title line-clamp-2 leading-snug group-hover:underline">{post.title}</h3>
          <p className="mt-1 line-clamp-2 text-[15px] leading-[1.55] text-body">{post.summary}</p>
          <p className="mono mt-2 text-xs text-muted"><time dateTime={post.date}>{dotDate(post.date)}</time></p>
        </div>
        <CoverArt slug={post.slug} thumbnail className="post-thumb aspect-square w-16 shrink-0 self-center sm:aspect-[4/3] sm:w-32" />
      </a>
    </li>
  );
}

function PopularBox() {
  return (
    <section className="border-t-2 border-ink py-4">
      <h2 className="text-[15px] font-bold text-muted">인기 있는 글</h2>
      <ol className="mt-4 space-y-4">
        {popular.map((post, index) => (
          <li key={post.slug}>
            <a href={hrefFor({ page: "post", slug: post.slug })} className="group flex min-h-11 items-start gap-3">
              <span className="mono w-6 shrink-0 pt-px text-[13px] text-muted">{String(index + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block text-[14px] leading-snug font-semibold group-hover:underline">{post.title}</span>
                <span className="mono mt-1 block text-[12px] text-muted">{dotDate(post.date)}</span>
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
          <section key={entry.id} className="border-t border-line py-4">
            <div className="flex items-center gap-2">
              {entry.ongoing ? <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-surface">연재 중</span> : null}
              <h2 className="text-[15px] font-bold">{entry.name}</h2>
            </div>
            <ol className="mt-3 space-y-2">
              {parts.map((post) => (
                <li key={post.slug}>
                  <a href={hrefFor({ page: "post", slug: post.slug })} className="flex min-h-11 items-center gap-2 text-[14px] text-body hover:text-ink hover:underline">
                    <span className="w-8 shrink-0 text-muted tabular-nums">{post.series?.part}화</span>
                    <span className="min-w-0">{post.title.replace(/^.*?:\s*/, "")}</span>
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
