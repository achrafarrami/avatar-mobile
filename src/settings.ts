import { useSyncExternalStore } from "react";

// App settings persisted to localStorage. Small + flat: read anywhere via
// useSettings() (reactive) or getSettings() (imperative, e.g. inside useAura).
export type Quality = "low" | "medium" | "high";
export type Settings = { language: string; quality: Quality };

// language label -> ISO-639-1 code (STT hint); label itself feeds the chat prompt
export const LANGUAGES: [label: string, code: string][] = [
  ["English", "en"], ["Français", "fr"], ["Español", "es"], ["Deutsch", "de"],
  ["Italiano", "it"], ["Português", "pt"], ["العربية", "ar"], ["日本語", "ja"],
];
export const langCode = (label: string) =>
  LANGUAGES.find(([l]) => l === label)?.[1] ?? "en";

const KEY = "aura-settings";
const DEFAULTS: Settings = { language: "English", quality: "high" };

let state: Settings = { ...DEFAULTS };
try { state = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { /* defaults */ }

const subs = new Set<() => void>();
export const getSettings = () => state;
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  state = { ...state, [k]: v };
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}
export const useSettings = () =>
  useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), getSettings);
