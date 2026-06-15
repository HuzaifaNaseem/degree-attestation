/**
 * ThemeContext — app-wide theme state.
 * Persists choice to localStorage and sets data-theme on <html>.
 * Themes: "dark" (default) · "light" · "brown" (warm sepia).
 */
import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "dark",  label: "Dark",  swatch: "#0D1220", accent: "#7C6CF6" },
  { id: "light", label: "Light", swatch: "#FFFFFF", accent: "#6D5EF5" },
];

const VALID = THEMES.map((t) => t.id);
const ThemeCtx = createContext({ theme: "dark", setTheme: () => {} });

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("theme");
    return VALID.includes(saved) ? saved : "dark";
  });

  // Apply on mount + whenever it changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (t) => { if (VALID.includes(t)) setThemeState(t); };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
