// 빈 상태는 점선 상자와 아이콘 틀 없이 제목 아래에 굵은 한 줄과 설명만 둔다
// (tastepin 규칙: 그룹은 여백과 글자 굵기로 나눈다). 아이콘은 사이드바와 이동 경로가 이미 보여 준다.
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-7 max-w-[440px]">
      <p className="text-[15px] font-semibold leading-6 text-ink">{title}</p>
      <p className="mt-0.5 text-[15px] leading-[1.55] text-muted">{body}</p>
    </div>
  );
}
