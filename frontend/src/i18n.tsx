import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { getLocalStorage } from "./browser-storage";
import type { InterfaceStyleId } from "./interface-style";
import { defaultLocale, interfaceStyleLabels, locales, messages, paletteLabels, themeLabels, type Locale, type MessageParams, type Messages } from "./i18n-data";
import type { BeadColor } from "./palette";
import type { ThemeId } from "./themes";

export const localeStorageKey = "fundbeads.locale";

export { defaultLocale, interfaceStyleLabels, locales, messages, paletteLabels, themeLabels };
export type { Locale, MessageParams, Messages };
type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: string) => void;
  t: (key: keyof Messages, params?: MessageParams) => string;
  formatNumber: (value: number) => string;
  paletteLabel: (color: BeadColor) => string;
  themeLabel: (theme: ThemeId) => string;
  interfaceStyleLabel: (style: InterfaceStyleId) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-sg" || normalized.startsWith("zh-hans")) {
    return "zh-Hans";
  }
  if (normalized === "zh-tw" || normalized === "zh-hk" || normalized === "zh-mo" || normalized.startsWith("zh-hant")) {
    return "zh-Hant";
  }
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja";
  }
  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko";
  }
  if (normalized === "es" || normalized.startsWith("es-")) {
    return "es";
  }

  return null;
}

export function resolveLocale(storedLocale: string | null | undefined, browserLocales: readonly string[]): Locale {
  const stored = normalizeLocale(storedLocale);
  if (stored) {
    return stored;
  }

  for (const browserLocale of browserLocales) {
    const matched = normalizeLocale(browserLocale);
    if (matched) {
      return matched;
    }
  }

  return defaultLocale;
}

export function translate(locale: Locale, key: keyof Messages, params: MessageParams = {}): string {
  const template = messages[locale][key] ?? messages[defaultLocale][key];
  return template.replaceAll(/\{(\w+)\}/g, (_, paramName: string) => String(params[paramName] ?? `{${paramName}}`));
}

export function getPaletteLabel(locale: Locale, color: BeadColor): string {
  return paletteLabels[locale][color.code] ?? color.label;
}

export function getThemeLabel(locale: Locale, theme: ThemeId): string {
  return themeLabels[locale][theme] ?? themeLabels[defaultLocale][theme];
}

export function getInterfaceStyleLabel(locale: Locale, style: InterfaceStyleId): string {
  return interfaceStyleLabels[locale][style] ?? interfaceStyleLabels[defaultLocale][style];
}

export function readStoredLocale(storage: Storage | undefined): string | null {
  try {
    return storage?.getItem(localeStorageKey) ?? null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(storage: Storage | undefined, locale: Locale) {
  try {
    storage?.setItem(localeStorageKey, locale);
  } catch {
    // Preference persistence is optional; the app should continue if storage is unavailable.
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const browserLocales = typeof navigator === "undefined" ? [] : navigator.languages;
    return resolveLocale(readStoredLocale(getLocalStorage()), browserLocales);
  });

  const value = useMemo<I18nContextValue>(() => {
    const formatter = new Intl.NumberFormat(locale);

    return {
      locale,
      setLocale: (nextLocale) => {
        const normalizedLocale = normalizeLocale(nextLocale);
        if (!normalizedLocale) {
          return;
        }
        setLocaleState(normalizedLocale);
        writeStoredLocale(getLocalStorage(), normalizedLocale);
      },
      t: (key, params) => translate(locale, key, params),
      formatNumber: (number) => formatter.format(number),
      paletteLabel: (color) => getPaletteLabel(locale, color),
      themeLabel: (nextTheme) => getThemeLabel(locale, nextTheme),
      interfaceStyleLabel: (style) => getInterfaceStyleLabel(locale, style),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}
