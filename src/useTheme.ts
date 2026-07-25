import { useEffect, useState } from "react";

// Theme = "dark" | "light"; persisted; applied via data-theme on <html>.
// Defaults to system when nothing is stored.
export type Theme = "dark" | "light";

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("aura-theme") as Theme) ||
      (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", theme === "light" ? "#f5f5fb" : "#0b0b12");
    localStorage.setItem("aura-theme", theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}
