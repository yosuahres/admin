"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  prefersDark,
  readTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Another tab changed the theme. */
function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY) return;
  applyTheme(readTheme());
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** The saved theme choice, and a setter that applies and persists it. */
export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => "light" as Theme,
  );

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies for this page.
    }
    applyTheme(next);
    notify();
  }, []);

  return { theme, setTheme };
}

/**
 * Mounted once at the root. Keeps "system" in step with the OS while the app
 * is open, and re-applies the attribute after React's dev-only remount clears
 * what the inline script set on <html>.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readTheme());

    const media = prefersDark();
    const onChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
