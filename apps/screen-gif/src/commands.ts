import { invoke } from "@tauri-apps/api/core";

/** 화면의 물리 픽셀 좌표 */
export type ScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type WindowTarget = {
  /** 운영체제의 창 식별자 */
  id: number;
  title: string;
  bounds: ScreenRect;
};

export type Target = { kind: "region"; rect: ScreenRect } | { kind: "window"; id: number };

/** `elapsedMs`는 녹화 중일 때 Rust가 잰 녹화 경과 시간이다. */
export type ViewSession = { id: number; error: string | null; elapsedMs: number | null };
export const viewSession = () => invoke<ViewSession | null>("view_session");
export const listWindows = () => invoke<WindowTarget[]>("list_windows");
export const cancelSelection = (id: number) => invoke<void>("cancel_selection", { id });
export const startRecording = (id: number, target: Target) => invoke<void>("start_recording", { id, target });
export const stopRecording = (id: number) => invoke<string>("stop_recording", { id });
export const cancelRecording = (id: number) => invoke<void>("cancel_recording", { id });
