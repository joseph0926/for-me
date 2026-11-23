import test from "node:test";
import assert from "node:assert/strict";
import { hitMark, moveMark } from "../src/document.ts";
import { handles, hitHandle, resizeMark } from "../src/resize.ts";
import { appendSamples, finishStroke } from "../src/pen.ts";

const view = { x: 100, y: 200, width: 400, height: 300 };
const box = { tool: "cover", area: { x: 180, y: 280, width: 100, height: 50 }, color: "#111111", strokeWidth: 4 };

test("모든 모서리가 반대쪽을 고정하고 손잡이를 누르기만 하면 원래 크기를 유지한다", () => {
  const expected = {
    nw: [160, 270, 120, 60], ne: [180, 270, 120, 60],
    sw: [160, 280, 120, 60], se: [180, 280, 120, 60],
  };
  for (const start of handles(box, 0.5, view)) {
    const corner = hitHandle(box, start, 0.5, view);
    assert.equal(corner.id, start.corner.id);
    assert.equal(resizeMark(box, corner, start, start, view), box);
    const end = { x: start.x + (corner.right ? 20 : -20), y: start.y + (corner.bottom ? 10 : -10) };
    const { x, y, width, height } = resizeMark(box, corner, start, end, view).area;
    assert.deepEqual([x, y, width, height], expected[corner.id]);
  }
});

test("반대쪽을 지나 끌어도 가리기 영역은 한 픽셀 이상이고 작은 표시의 중앙은 이동할 수 있다", () => {
  const start = handles(box, 1, view)[0];
  const small = resizeMark(box, start.corner, start, { x: 490, y: 490 }, view);
  assert.deepEqual(small.area, { x: 279, y: 329, width: 1, height: 1 });
  assert.equal(hitHandle(small, { x: 279.5, y: 329.5 }, 1, view), undefined);
});

test("메모 크기를 바꿀 때 글꼴 비율과 줄 배치를 보존한다", () => {
  const memo = { ...box, tool: "memo", text: "두 줄\n메모", fontSize: 20, bold: true };
  const start = handles(memo, 1, view)[3];
  const resized = resizeMark(memo, start.corner, start, { x: start.x + 100, y: start.y + 50 }, view);
  assert.deepEqual(resized.area, { x: 180, y: 280, width: 200, height: 100 });
  assert.equal(resized.fontSize, 40);
  assert.equal(resized.layoutFontSize, 20);
  assert.equal(resized.text, memo.text);
});

test("자유선의 굽은 부분만 선택하고 옮긴 뒤에도 같은 모양을 유지한다", () => {
  const points = appendSamples([120, 240], [{ x: 140, y: 240 }, { x: 140, y: 240 }, { x: 140, y: 290 }]);
  const style = { color: "#123456", strokeWidth: 4 };
  const stroke = finishStroke(points, style);
  assert.deepEqual(stroke.points, [0, 0, 20, 0, 20, 50]);
  const moved = moveMark(stroke, { x: 140, y: 270 }, { x: 150, y: 280 }, view);
  const marks = new Map([[1, moved]]);
  assert.equal(hitMark(marks, { x: 150, y: 275 }, 1), 1);
  assert.equal(hitMark(marks, { x: 130, y: 290 }, 1), null);
  assert.equal(hitMark(new Map([[2, finishStroke([130, 250], style)]]), { x: 130, y: 251 }, 1), 2);
});
