import { findCategory } from "../data";

export function CategoryDot({ categoryId, size = 36 }: { categoryId: string; size?: number }) {
  const category = findCategory(categoryId);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: category.color, fontSize: size * 0.36 }}
    >
      {category.name.slice(0, 1)}
    </span>
  );
}
