/**
 * ThemeContext — app-wide theme state.
 * Persists choice to localStorage and sets data-theme on <html>.
 * Themes: "dim" (default, soft slate) · "light".
 */
import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "dim",   label: "Dim",   swatch: "#212738", accent: "#8171F8" },
  { id: "light", label: "Light", swatch: "#FFFFFF", accent: "#6D5EF5" },
];

const VALID = THEMES.map((t) => t.id);
const ThemeCtx = createContext({ theme: "dim", setTheme: () => {} });

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    let saved = localStorage.getItem("theme");
    if (saved === "dark") saved = "dim";  // migrate the old dark theme → dim
    return VALID.includes(saved) ? saved : "dim";
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
