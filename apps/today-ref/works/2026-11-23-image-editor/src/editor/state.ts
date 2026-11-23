// 편집 내용. 원본 픽셀은 바꾸지 않고 이 값으로 매번 다시 그린다(되돌리기와 비교가 쉬워진다).
export type Rotation = 0 | 90 | 180 | 270;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const adjustKeys = ["exposure", "contrast", "highlights", "saturation", "warmth", "tint", "vignette", "fade"] as const;
export type AdjustKey = (typeof adjustKeys)[number];
export type Adjustments = Record<AdjustKey, number>;

export interface AdjustSpec {
  key: AdjustKey;
  label: string;
  min: number;
  max: number;
}

// 조정 패널의 묶음(r1). 값은 모두 -100~100이고 0이 원본이다. 비네트와 바랜 느낌만 0~100이다.
export const adjustGroups: { id: "light" | "color" | "effect"; title: string; specs: AdjustSpec[] }[] = [
  {
    id: "light",
    title: "빛",
    specs: [
      { key: "exposure", label: "노출", min: -100, max: 100 },
      { key: "contrast", label: "대비", min: -100, max: 100 },
      { key: "highlights", label: "밝은 영역", min: -100, max: 100 },
    ],
  },
  {
    id: "color",
    title: "색",
    specs: [
      { key: "saturation", label: "채도", min: -100, max: 100 },
      { key: "warmth", label: "색온도", min: -100, max: 100 },
      { key: "tint", label: "색조", min: -100, max: 100 },
    ],
  },
  {
    id: "effect",
    title: "효과",
    specs: [
      { key: "vignette", label: "비네트", min: 0, max: 100 },
      { key: "fade", label: "바랜 느낌", min: 0, max: 100 },
    ],
  },
];

export type GroupId = (typeof adjustGroups)[number]["id"];

export const neutralAdjust: Adjustments = { exposure: 0, contrast: 0, highlights: 0, saturation: 0, warmth: 0, tint: 0, vignette: 0, fade: 0 };

export interface FilterPreset {
  id: string;
  label: string;
  // 강도 100%일 때 더하는 조정 값과 흑백, 세피아.
  adjust: Partial<Adjustments>;
  grayscale?: number;
  sepia?: number;
}

export const filterPresets: FilterPreset[] = [
  { id: "none", label: "원본", adjust: {} },
  { id: "clear", label: "맑음", adjust: { exposure: 10, contrast: 18, saturation: 22 } },
  { id: "warm", label: "노을", adjust: { warmth: 45, saturation: 12, exposure: 6, vignette: 25 } },
  { id: "cool", label: "새벽", adjust: { warmth: -40, tint: -10, contrast: 10, fade: 15 } },
  { id: "film", label: "필름", adjust: { contrast: -12, fade: 40, warmth: 15, saturation: -18, vignette: 30 } },
  { id: "punch", label: "선명", adjust: { contrast: 40, saturation: 35, highlights: -20 } },
  { id: "mono", label: "흑백", adjust: { contrast: 25 }, grayscale: 100 },
  { id: "noir", label: "느와르", adjust: { contrast: 60, exposure: -12, vignette: 45 }, grayscale: 100 },
  { id: "sepia", label: "바랜 사진", adjust: { fade: 30, contrast: -8 }, sepia: 80 },
];

export type MarkKind = "pen" | "text" | "rect" | "arrow";

// 표시를 그린 순간의 화면 방향을 지키려고 이미지 회전과 뒤집기를 상쇄하는 값. 그린 뒤 이미지를 돌리면 표시도 이미지와 함께 돈다.
export interface Counter {
  degrees: number;
  flipX: boolean;
  flipY: boolean;
}

export interface MarkBase {
  id: string;
  color: string;
  // 원본 이미지 픽셀 기준 굵기. 자르거나 돌려도 이미지와 같은 비율을 유지한다.
  width: number;
}

// 표시의 좌표는 모두 원본 이미지 좌표다. 회전, 뒤집기, 수평, 자르기를 바꿔도 이미지와 함께 움직인다.
export type Mark =
  | (MarkBase & { kind: "pen"; points: [number, number][] })
  | (MarkBase & { kind: "arrow"; from: [number, number]; to: [number, number] })
  // 사각형은 화면에서 반듯하게 그린 네 꼭짓점을 원본 좌표로 저장한다.
  | (MarkBase & { kind: "rect"; corners: [number, number][] })
  | (MarkBase & { kind: "text"; at: [number, number]; text: string; size: number; counter: Counter });

export interface EditState {
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  // 수평 맞추기 각도(도). -45~45.
  straighten: number;
  // 돌리고 수평을 맞춘 이미지 위의 자르기 범위. null이면 전체.
  crop: Rect | null;
  adjust: Adjustments;
  // 묶음을 꺼도 값은 남겨 두고 그리기에서만 뺀다.
  disabledGroups: GroupId[];
  filter: { id: string; amount: number };
  marks: Mark[];
}

export const initialEdit: EditState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  straighten: 0,
  crop: null,
  adjust: neutralAdjust,
  disabledGroups: [],
  filter: { id: "none", amount: 100 },
  marks: [],
};

// 묶음 켜기와 필터를 반영해 실제로 그릴 값. 필터는 강도만큼 조정 값에 더한다.
export function effectiveLook(edit: EditState): { adjust: Adjustments; grayscale: number; sepia: number } {
  const adjust = { ...neutralAdjust };
  for (const group of adjustGroups) {
    if (edit.disabledGroups.includes(group.id)) continue;
    for (const spec of group.specs) adjust[spec.key] = edit.adjust[spec.key];
  }
  const preset = filterPresets.find((item) => item.id === edit.filter.id) ?? filterPresets[0];
  const ratio = edit.filter.amount / 100;
  for (const key of Object.keys(preset.adjust) as AdjustKey[]) {
    adjust[key] = Math.max(-100, Math.min(100, adjust[key] + (preset.adjust[key] ?? 0) * ratio));
  }
  return { adjust, grayscale: (preset.grayscale ?? 0) * ratio, sepia: (preset.sepia ?? 0) * ratio };
}

export function isEdited(edit: EditState): boolean {
  return JSON.stringify(edit) !== JSON.stringify(initialEdit);
}

// 되돌리기 기록. 같은 슬라이더를 끄는 동안처럼 같은 묶음 키로 이어지는 변경은 한 번으로 합친다.
export interface History {
  past: EditState[];
  present: EditState;
  future: EditState[];
  lastKey: string | null;
}

export type HistoryAction =
  | { type: "set"; next: EditState; key?: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "seal" }
  | { type: "reset"; next: EditState };

const historyLimit = 100;

export function historyReducer(history: History, action: HistoryAction): History {
  switch (action.type) {
    case "set": {
      if (JSON.stringify(action.next) === JSON.stringify(history.present)) return history;
      const merge = action.key !== undefined && action.key === history.lastKey;
      return {
        past: merge ? history.past : [...history.past, history.present].slice(-historyLimit),
        present: action.next,
        future: [],
        lastKey: action.key ?? null,
      };
    }
    case "seal":
      return { ...history, lastKey: null };
    case "undo": {
      const previous = history.past.at(-1);
      if (!previous) return history;
      return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future], lastKey: null };
    }
    case "redo": {
      const [next, ...rest] = history.future;
      if (!next) return history;
      return { past: [...history.past, history.present], present: next, future: rest, lastKey: null };
    }
    case "reset":
      return { past: [], present: action.next, future: [], lastKey: null };
  }
}
