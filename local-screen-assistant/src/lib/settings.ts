import { invoke } from "@tauri-apps/api/core";

export type OcrEngine = "windows-native" | "tesseract";
export type ModelMode = "local" | "cloud";

export interface Settings {
  sourceFolders: string[];
  hotkey: string;
  ocrEngine: OcrEngine;
  modelMode: ModelMode;
  launchOnStartup: boolean;
}

export const defaultSettings: Settings = {
  sourceFolders: [],
  hotkey: "Ctrl+Shift+Space",
  ocrEngine: "windows-native",
  modelMode: "local",
  launchOnStartup: false,
};

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  return invoke<Settings>("save_settings", { settings });
}

