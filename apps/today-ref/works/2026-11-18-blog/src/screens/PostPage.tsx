import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { ArticleFigure } from "../components/ArticleFigure";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";
import { CategoryBadge, OngoingMark } from "../components/PostMeta";
import { SubscribeForm } from "../components/SubscribeForm";
import { blog, formatDate, posts, readingMinutes, seriesById, seriesPosts, type Block, type Post } from "../data";
import { hrefFor } from "../route";

// 본문을 지나간 비율. 창 스크롤이라는 외부 상태를 따라간다.
function useReadingProgress(target: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const element = target.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const passed = -rect.top;
      setProgress(scrollable <= 0 ? 1 : Math.min(1, Math.max(0, passed / scrollable)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [target]);
  return progress;
}

// 큰 제목이 위 줄 밑으로 지나갔는지. 제목이 보이는 동안 위 줄에 연재와 회차를 또 적으면 같은 말이 두 번 보인다.
function usePassed(target: React.RefObject<HTMLElement | null>, offset: number): boolean {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setPassed(!entry.isIntersecting && entry.boundingClientRect.top < offset), {
      rootMargin: `-${offset}px 0px 0px 0px`,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, offset]);
  return passed;
}

const easeOutCubic = [0.215, 0.61, 0.355, 1] as const;

// 좋아요 수가 바뀌면 늘 때는 새 숫자가 아래에서, 줄 때는 위에서 들어오고 이전 숫자는 반대로 나간다. 두 숫자는 겹쳐 지나간다.
function RollingCount({ value }: { value: number }) {
  const previous = useRef(value);
  const direction = value >= previous.current ? 1 : -1;
  useEffect(() => {
    previous.current = value;
  }, [value]);
  return (
    <span className="relative inline-grid overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span
          key={value}
          custom={direction}
          variants={{
            enter: (dir: number) => ({ y: 10 * dir, opacity: 0 }),
            center: { y: 0, opacity: 1 },
            exit: (dir: number) => ({ y: -10 * dir, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function PostPage({
  post,
  liked,
  onToggleLike,
  onShare,
  subscribedEmail,
  onSubscribe,
}: {
  post: Post;
  liked: boolean;
  onToggleLike: () => void;
  onShare: () => void;
  subscribedEmail: string | null;
  onSubscribe: (email: string) => void;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const progress = useReadingProgress(articleRef);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titlePassed = usePassed(titleRef, 56);
  const seriesEntry = post.series ? seriesById(post.series.id) : undefined;
  const likeCount = post.likes + (liked ? 1 : 0);
  const related = posts.filter((other) => other.category === post.category && other.slug !== post.slug && (!post.series || other.series?.id !== post.series.id)).slice(0, 2);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-line/70 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <a href={hrefFor({ page: "home", category: null })} aria-label="블로그 홈으로" className="flex min-h-11 min-w-11 shrink-0 items-center gap-1 text-[15px] font-extrabold">
            <Icon name="back" className="size-4 text-muted" />
            <span className="hidden sm:inline">{blog.name}</span>
          </a>
          <div className="flex min-w-0 flex-1 items-center justify-center text-[13px]">
            <AnimatePresence initial={false}>
              {titlePassed ? (
                <motion.div
                  key="context"
                  className="flex min-w-0 items-center gap-2"
                  initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  transition={{ duration: 0.22, ease: easeOutCubic }}
                >
                  {seriesEntry && post.series ? (
                    <>
                      {seriesEntry.ongoing ? <OngoingMark /> : null}
                      <span className="truncate text-body">
                        {seriesEntry.name} | {post.series.part}화
                      </span>
                    </>
                  ) : (
                    <span className="truncate text-muted">{post.category}</span>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={onToggleLike}
            aria-pressed={liked}
            aria-label={liked ? "좋아요 취소" : "좋아요"}
            className={`icon-button h-11 shrink-0 gap-1.5 px-3 text-[13px] font-semibold ${liked ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            <Icon name="heart" filled={liked} className="size-[18px]" />
            <RollingCount value={likeCount} />
          </button>
          <button type="button" onClick={onShare} aria-label="링크 복사" className="icon-button size-11 shrink-0 text-muted hover:text-ink">
            <Icon name="share" className="size-[18px]" />
          </button>
        </div>
        <div className="h-0.5 bg-transparent" role="progressbar" aria-label="읽은 정도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full origin-left bg-accent" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>

      <main id="main-content" tabIndex={-1} className="px-5 pb-24 sm:px-8">
        <article ref={articleRef} className="reader">
          <header className="reader-head">
            <CategoryBadge post={post} />
            <h1 ref={titleRef}>{post.title}</h1>
            <dl className="facts">
              <div><dt>글쓴이</dt><dd>{blog.author}</dd></div>
              <div><dt>날짜</dt><dd><time dateTime={post.date}>{formatDate(post.date)}</time></dd></div>
              <div><dt>분량</dt><dd>{readingMinutes(post)}분</dd></div>
            </dl>
          </header>
          <CoverArt slug={post.slug} className="reader-cover" />
          <div className="reader-body">
            {post.blocks.map((block, index) => (
              <BlockView key={index} block={block} />
            ))}
          </div>

          {/* 위 줄 버튼과 같은 이름(좋아요)과 같은 상태를 쓴다. 누른 상태는 채운 하트와 aria-pressed가 알린다. */}
          <div className="mt-14 flex items-center justify-center gap-3">
            <button type="button" onClick={onToggleLike} aria-pressed={liked} className="btn-secondary gap-2">
              <Icon name="heart" filled={liked} className="size-[18px]" />
              좋아요 <RollingCount value={likeCount} />
            </button>
          </div>
        </article>

        <div className="mx-auto mt-14 max-w-[680px] space-y-10">
          {seriesEntry && post.series ? <SeriesNav post={post} /> : null}
          {related.length > 0 ? (
            <section>
              <h2 className="text-[17px] font-bold">{post.category}의 다른 글</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.map((other) => (
                  <li key={other.slug}>
                    <a href={hrefFor({ page: "post", slug: other.slug })} className="group block">
                      <CoverArt slug={other.slug} thumbnail sizes="(max-width: 639px) 100vw, 320px" className="aspect-[16/9]" />
                      <span className="mt-3 block text-[15px] leading-snug font-semibold group-hover:underline">{other.title}</span>
                      <span className="mt-1 block text-[13px] text-muted tabular-nums">{formatDate(other.date)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <SubscribeForm subscribedEmail={subscribedEmail} onSubscribe={onSubscribe} />
        </div>
      </main>
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h2":
      return <h2 className="pt-6 text-base leading-snug font-[650] text-ink">{block.text}</h2>;
    case "quote":
      // r1의 세로줄 인용은 지키되, 굵은 잉크 막대 대신 1px 옅은 선으로 두고 인용임은 굵은 글자가 알린다.
      return <blockquote className="border-l border-line py-1 pl-5 font-semibold text-ink">{block.text}</blockquote>;
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-6 marker:text-accent">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-md bg-sunken p-5 font-mono text-[14px] leading-relaxed text-ink">
          <code>{block.code}</code>
        </pre>
      );
    case "figure":
      return (
        <figure className="py-2">
          <div className="rounded-md bg-sunken p-4 sm:p-5">
            <p className="border-b border-line pb-3 text-[15px] font-semibold text-ink">{block.title}</p>
            <ArticleFigure art={block.art} className="mt-4 aspect-[16/9] rounded-md" />
          </div>
          <figcaption className="mt-3 text-center text-[13px] text-muted">{block.caption}</figcaption>
        </figure>
      );
  }
}

function SeriesNav({ post }: { post: Post }) {
  if (!post.series) return null;
  const entry = seriesById(post.series.id);
  const parts = seriesPosts(post.series.id);
  const index = parts.findIndex((part) => part.slug === post.slug);
  const previous = parts[index - 1];
  const next = parts[index + 1];
  if (!entry) return null;

  return (
    <section>
      <div className="flex items-center gap-3">
        <h2 className="text-[16px] font-bold">{entry.name}</h2>
        {entry.ongoing ? <OngoingMark /> : null}
        <span className="ml-auto text-[13px] text-muted tabular-nums">
          {post.series.part} / {parts.length}화
        </span>
      </div>
      <ol className="mt-4 space-y-1">
        {parts.map((part) => {
          const current = part.slug === post.slug;
          return (
            <li key={part.slug}>
              <a
                href={hrefFor({ page: "post", slug: part.slug })}
                aria-current={current ? "page" : undefined}
                className={`flex gap-3 rounded-md px-3 py-2 text-[14px] ${current ? "bg-accent-soft font-semibold text-accent" : "text-body hover:text-ink hover:underline"}`}
              >
                <span className="w-8 shrink-0 tabular-nums">{part.series?.part}화</span>
                <span className="min-w-0 truncate">{part.title.replace(/^.*?:\s*/, "")}</span>
              </a>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[14px]">
        {previous ? (
          <a href={hrefFor({ page: "post", slug: previous.slug })} className="btn-secondary justify-self-start gap-1 pl-3">
            <Icon name="back" className="size-4" /> 이전 화
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={hrefFor({ page: "post", slug: next.slug })} className="btn-secondary justify-self-end gap-1 pr-3">
            다음 화 <Icon name="next" className="size-4" />
          </a>
        ) : (
          <span className="flex items-center justify-end text-muted">다음 화를 쓰는 중</span>
        )}
      </div>
    </section>
  );
}
