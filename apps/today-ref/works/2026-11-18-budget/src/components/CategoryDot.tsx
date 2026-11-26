import { findCategory } from "../data";

// 분류 색 점. 예전에는 분류 이름 첫 글자를 흰 글씨로 넣은 큰 원이었는데, 바로 옆에 분류 이름이 늘 있어 같은 말을
// 두 번 했다. 그래프와 목록의 색을 잇는 일만 하도록 글자 없는 작은 점으로 둔다.
export function CategoryDot({ categoryId, size = 10 }: { categoryId: string; size?: number }) {
  const category = findCategory(categoryId);
  return <span aria-hidden className="shrink-0 rounded-full" style={{ width: size, height: size, background: category.color }} />;
}
