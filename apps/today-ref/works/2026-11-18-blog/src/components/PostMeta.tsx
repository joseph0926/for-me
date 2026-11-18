import { seriesById, type Post } from "../data";

export function CategoryBadge({ post }: { post: Post }) {
  return <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">{post.category}</span>;
}

export function SeriesBadge({ post }: { post: Post }) {
  if (!post.series) return null;
  const entry = seriesById(post.series.id);
  if (!entry) return null;
  return (
    <span className="rounded-md bg-sunken px-2 py-0.5 text-[12px] font-medium text-muted">
      {entry.name} {post.series.part}화
    </span>
  );
}
