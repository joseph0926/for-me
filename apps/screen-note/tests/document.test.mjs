import test from "node:test";
import assert from "node:assert/strict";
import { currentMarks, hitMark, imagePoint, moveMark, recolorMark, selection, visibleRegion } from "../src/document.ts";

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

test("표시를 지웠다가 되돌리면 마지막 색과 겹친 순서가 복구된다", () => {
  const cover = { tool: "cover", area: { x: 10, y: 20, width: 30, height: 40 }, color: "#191b20", strokeWidth: 3 };
  const highlight = { ...cover, tool: "highlight" };
  const edits = recolorMark([
    { tool: "mark", id: 1, mark: cover },
    { tool: "mark", id: 2, mark: highlight },
  ], 1, "#ffffff");
  const removed = [...edits, { tool: "remove", id: 1 }];
  assert.deepEqual([...currentMarks(removed)], [[2, highlight]]);
  assert.deepEqual([...currentMarks(removed.slice(0, -1))], [
    [1, { ...cover, color: "#ffffff" }], [2, highlight],
  ]);
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
  assert.equal(hitMark(undone, { x: 40, y: 70 }, 1), 2);
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

test("강조 상자 안쪽을 누르면 그 아래 표시를, 아래에 표시가 없으면 강조를 고른다", () => {
  const memo = {
    tool: "memo", area: { x: 100, y: 100, width: 80, height: 30 },
    text: "메모", bold: false, color: "#ffffff", fontSize: 20,
  };
  const highlight = { tool: "highlight", area: { x: 60, y: 60, width: 200, height: 120 }, color: "#ee5319", strokeWidth: 4 };
  const marks = new Map([[1, memo], [2, highlight]]);
  assert.equal(hitMark(marks, { x: 120, y: 110 }, 1), 1);
  assert.equal(hitMark(marks, { x: 220, y: 150 }, 1), 2);
  assert.equal(hitMark(marks, { x: 61, y: 110 }, 1), 2);
  assert.equal(hitMark(marks, { x: 300, y: 300 }, 1), null);
});

test("색을 고르는 동안 이어진 색 변경은 되돌리기 한 번으로 고르기 전 색이 된다", () => {
  const view = { x: 0, y: 0, width: 600, height: 400 };
  const cover = { tool: "cover", area: { x: 40, y: 50, width: 80, height: 60 }, color: "#191b20", strokeWidth: 3 };
  const other = { ...cover, area: { x: 200, y: 50, width: 80, height: 60 } };
  const created = [{ tool: "mark", id: 1, mark: cover }, { tool: "mark", id: 2, mark: other }];
  let edits = created;
  for (const color of ["#330000", "#990000", "#ff0000"]) edits = recolorMark(edits, 1, color);
  assert.equal(edits.length, 3);
  assert.equal(currentMarks(edits).get(1).color, "#ff0000");
  assert.equal(currentMarks(edits.slice(0, -1)).get(1).color, "#191b20");

  edits = recolorMark(edits, 2, "#00ff00");
  assert.equal(edits.length, 4);
  assert.equal(currentMarks(edits.slice(0, -1)).get(1).color, "#ff0000");

  const moved = moveMark(currentMarks(edits).get(2), { x: 210, y: 60 }, { x: 260, y: 60 }, view);
  edits = recolorMark([...edits, { tool: "mark", id: 2, mark: moved }], 2, "#0000ff");
  assert.equal(edits.length, 6);
  assert.deepEqual(currentMarks(edits.slice(0, -1)).get(2), moved);

  assert.deepEqual(recolorMark(recolorMark(created, 1, "#ff0000"), 1, "#191b20"), created);
});
