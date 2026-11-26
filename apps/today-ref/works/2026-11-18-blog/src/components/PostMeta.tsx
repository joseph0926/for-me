import { seriesById, type Post } from "../data";

// 분류는 대표 글, 다른 대표 글, 목록, 글 화면에서 모두 이 한 모양(보조색 13px)으로 쓴다.
// 예전에는 자리마다 크기와 굵기가 달라 같은 분류가 다른 표시처럼 보였다.
export function CategoryBadge({ post }: { post: Post }) {
  return <span className="text-[13px] font-medium text-muted">{post.category}</span>;
}

export function SeriesBadge({ post }: { post: Post }) {
  if (!post.series) return null;
  const entry = seriesById(post.series.id);
  if (!entry) return null;
  return (
    <span className="border-l border-line pl-2 text-[13px] font-medium text-muted">
      {entry.name} {post.series.part}화
    </span>
  );
}

// '연재 중'은 상태라 검은 알약 대신 점과 글자로 둔다. 홈 연재 상자, 글 위 줄, 회차 목록이 같은 모양을 쓴다.
export function OngoingMark() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-ink">
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      연재 중
    </span>
  );
}
