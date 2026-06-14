/**
 * chartTheme — derives recharts colors from the active theme's CSS variables.
 * Called during render, so it updates when the theme switches (the whole tree
 * re-renders on theme change via ThemeProvider).
 */
export function chartColors() {
  const fallback = { gold: "#C9A84C", axis: "#8B90A7", grid: "#252A3A", surface: "#13161F", fg: "#ffffff" };
  if (typeof window === "undefined") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name, fb) => {
    const v = cs.getPropertyValue(name).trim();
    return v ? `rgb(${v})` : fb;
  };
  return {
    gold:    rgb("--accent", fallback.gold),
    axis:    rgb("--muted", fallback.axis),
    grid:    rgb("--line", fallback.grid),
    surface: rgb("--surface", fallback.surface),
    fg:      rgb("--fg", fallback.fg),
  };
}

/** Shared tooltip style so all charts match the theme. */
export function tooltipStyle(c) {
  return {
    contentStyle: {
      fontSize: 12,
      borderRadius: 10,
      background: c.surface,
      border: `1px solid ${c.grid}`,
      color: c.fg,
    },
    labelStyle: { color: c.axis },
    itemStyle: { color: c.fg },
  };
}
