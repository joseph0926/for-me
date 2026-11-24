import type { Tool } from "./document";

const paths = {
  picture: "M3 5h18v14H3zM3 16l6-6 5 5 3-3 4 4M16.5 8.5h.01",
  open: "M3 17V6a1 1 0 0 1 1-1h5l2 3h8a1 1 0 0 1 1 1v2M3 18l3-7h16l-3 8H4z",
  undo: "M9 5 4 10l5 5M5 10h9a6 6 0 0 1 6 6v2",
  save: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  copy: "M8 8h12v13H8zM16 5V3H4v13h1",
  select: "m5 3 14 10-7 1-3.5 6z",
  memo: "M4 5h16v12h-9l-5 4v-4H4zM8 9h8m-8 4h5",
  pen: "m4 20 1-5L16 4q1-1 2 0l2 2q1 1 0 2L9 19zM14 6l4 4",
  crop: "M7 3v14h14M3 7h14v14",
  cover: "M3 5h18v14H3zM4 12l6-6m-5 12L17 6m-6 12 9-9m-3 9 3-3",
  highlight: "M4 5h16v14H4zM8 3v4m8-4v4M8 17v4m8-4v4",
} satisfies Record<Tool | "picture" | "open" | "undo" | "copy" | "save", string>;

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
