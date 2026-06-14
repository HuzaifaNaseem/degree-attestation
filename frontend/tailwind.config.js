/** @type {import('tailwindcss').Config} */

// Semantic color tokens. Each maps to a CSS variable holding an "R G B" triplet,
// so Tailwind opacity modifiers (e.g. bg-accent/10) still work. The actual values
// are defined per-theme in index.css under [data-theme="..."].
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:          token("bg"),          // page background
        sidebar:     token("sidebar"),     // sidebar / chrome
        surface:     token("surface"),     // card surface
        elevated:    token("elevated"),    // inputs / hover rows
        line:        token("line"),        // borders
        "line-soft": token("line-soft"),   // subtle dividers
        fg:          token("fg"),          // primary text
        muted:       token("muted"),       // secondary text
        faint:       token("faint"),       // faint text / placeholders
        accent:      token("accent"),      // gold accent
        "accent-soft": token("accent-soft"), // light gold
        "accent-fg": token("accent-fg"),   // text on top of the accent
      },
    },
  },
  plugins: [],
};
