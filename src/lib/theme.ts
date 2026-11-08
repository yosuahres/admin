export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before first paint, so a saved dark theme never flashes light.
 * Mirrors readTheme + applyTheme below; keep the two in step.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t==="system"&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

function isTheme(value: string | null): value is Theme {
  return THEMES.includes(value as Theme);
}

/** The saved choice. Anything unset or unreadable is light. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "light";
  } catch {
    return "light";
  }
}

export function prefersDark() {
  return window.matchMedia(DARK_QUERY);
}

/** Resolves the choice against the OS and sets it on <html>. */
export function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && prefersDark().matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}
