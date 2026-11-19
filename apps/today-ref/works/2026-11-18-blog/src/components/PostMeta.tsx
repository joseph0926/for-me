import { seriesById, type Post } from "../data";

export function CategoryBadge({ post }: { post: Post }) {
  return <span className="text-[12px] font-semibold text-accent">{post.category}</span>;
}

export function SeriesBadge({ post }: { post: Post }) {
  if (!post.series) return null;
  const entry = seriesById(post.series.id);
  if (!entry) return null;
  return (
    <span className="border-l border-line pl-2 text-[12px] font-medium text-muted">
      {entry.name} {post.series.part}화
    </span>
  );
}
