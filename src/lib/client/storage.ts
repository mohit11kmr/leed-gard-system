import { HistoryEntry } from "@/types/scan";

const HISTORY_KEY = "leadguard:history";
const THEME_KEY = "leadguard:theme";
export const HISTORY_LIMIT = 20;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry: HistoryEntry): HistoryEntry[] {
  const history = getHistory();
  const next = [
    entry,
    ...history.filter((h) => h.id !== entry.id),
  ].slice(0, HISTORY_LIMIT);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearHistory(): HistoryEntry[] {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(HISTORY_KEY);
  }
  return [];
}

export function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: "dark" | "light") {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_KEY, theme);
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}