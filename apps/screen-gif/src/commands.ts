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

export const listWindows = () => invoke<WindowTarget[]>("list_windows");
export const cancelSelection = () => invoke<void>("cancel_selection");
export const startRecording = (target: Target) => invoke<void>("start_recording", { target });
export const stopRecording = () => invoke<string>("stop_recording");
export const cancelRecording = () => invoke<void>("cancel_recording");
