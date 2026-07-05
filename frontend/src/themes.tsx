import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { getLocalStorage } from "./browser-storage";

export const themeStorageKey = "fundbeads.theme";

export const themes = [
  { id: "classic" },
  { id: "midnight" },
  { id: "ocean" },
  { id: "candy" },
  { id: "mono" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const defaultTheme: ThemeId = "classic";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function normalizeTheme(value: string | null | undefined): ThemeId | null {
  return themes.some((theme) => theme.id === value) ? (value as ThemeId) : null;
}

export function readStoredTheme(storage: Storage | undefined): string | null {
  try {
    return storage?.getItem(themeStorageKey) ?? null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(storage: Storage | undefined, theme: ThemeId) {
  try {
    storage?.setItem(themeStorageKey, theme);
  } catch {
    // Preference persistence is optional; the app should continue if storage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return normalizeTheme(readStoredTheme(getLocalStorage())) ?? defaultTheme;
  });

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (nextTheme) => {
        const normalizedTheme = normalizeTheme(nextTheme);
        if (!normalizedTheme) {
          return;
        }
        setThemeState(normalizedTheme);
        writeStoredTheme(getLocalStorage(), normalizedTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
