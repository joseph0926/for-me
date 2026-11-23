import test from "node:test";
import assert from "node:assert/strict";
import { currentMarks, hitMark, imagePoint, moveMark, selection, visibleRegion } from "../src/document.ts";

test("연속 자르기 뒤 역방향으로 끌어도 원본 좌표에서 가릴 영역을 구한다", () => {
  const original = { x: 0, y: 0, width: 4000, height: 3000 };
  const first = { tool: "crop", area: { x: 400, y: 300, width: 2000, height: 1600 } };
  const second = { tool: "crop", area: { x: 600, y: 700, width: 1200, height: 800 } };
  const view = visibleRegion([first, second], original);
  const display = { x: 50, y: 25, width: 600, height: 400 };
  const start = imagePoint({ x: 350, y: 225 }, display, view);
  const end = imagePoint({ x: -20, y: 50 }, display, view);
  assert.deepEqual(selection(start, end), { x: 600, y: 750, width: 600, height: 350 });
  assert.deepEqual(visibleRegion([first], original), first.area);
  assert.deepEqual(visibleRegion([], original), original);
});

test("소수점으로 선택한 가장자리 픽셀까지 가린다", () => {
  assert.deepEqual(selection({ x: 0.9, y: 10.4 }, { x: 36.1, y: 24.8 }), {
    x: 0, y: 10, width: 37, height: 15,
  });
});

test("겹친 표시의 색을 바꿔도 쌓인 순서가 유지되고 이동만 되돌릴 수 있다", () => {
  const view = { x: 0, y: 0, width: 600, height: 400 };
  const area = { x: 40, y: 50, width: 80, height: 60 };
  const cover = { tool: "cover", area, color: "#191b20", strokeWidth: 3 };
  const highlight = { ...cover, tool: "highlight", color: "#ee5319" };
  const recolored = { ...cover, color: "#224466" };
  const moved = moveMark(recolored, { x: 50, y: 70 }, { x: 180, y: 90 }, view);
  const edits = [cover, highlight, recolored, moved].map((mark, index) => ({
    tool: "mark", id: index === 1 ? 2 : 1, mark,
  }));
  const items = currentMarks(edits);
  assert.equal(items.size, 2);
  assert.equal(hitMark(items, { x: 210, y: 80 }, 1), 1);
  assert.deepEqual(items.get(1).area, { x: 170, y: 70, width: 80, height: 60 });
  const undone = currentMarks(edits.slice(0, -1));
  assert.equal(hitMark(undone, { x: 60, y: 70 }, 1), 2);
  assert.deepEqual(undone.get(1), recolored);
  assert.deepEqual(currentMarks(edits.slice(0, -2)).get(1), cover);
});

test("자른 영역에서 메모를 가장자리까지 옮겨도 글자 속성과 크기가 유지된다", () => {
  const view = { x: 300, y: 200, width: 400, height: 200 };
  const note = {
    tool: "memo", area: { x: 310, y: 240, width: 120, height: 30 },
    text: "메모", bold: true, color: "#228888", fontSize: 24,
  };
  const moved = moveMark(note, { x: 340, y: 250 }, { x: 700, y: 200 }, view);
  assert.deepEqual(moved, { ...note, area: { x: 580, y: 200, width: 120, height: 30 } });
  assert.equal(moveMark(note, { x: 330, y: 250 }, { x: 330, y: 250 }, view), note);
});
