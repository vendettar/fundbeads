/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import appSource from "../src/App.tsx?raw";
import browserStorageSource from "../src/browser-storage.ts?raw";
import i18nSource from "../src/i18n.tsx?raw";
import mainSource from "../src/main.tsx?raw";
import themesSource from "../src/themes.tsx?raw";
import { getLocalStorage } from "../src/browser-storage";
import {
  defaultLocale,
  getPaletteLabel,
  getThemeLabel,
  locales,
  messages,
  normalizeLocale,
  paletteLabels,
  readStoredLocale,
  resolveLocale,
  themeLabels,
  translate,
  writeStoredLocale,
} from "../src/i18n";
import { mardPalette } from "../src/palette";
import { defaultTheme, normalizeTheme, readStoredTheme, themes, writeStoredTheme } from "../src/themes";

function throwingStorage(): Storage {
  return {
    length: 0,
    clear() {
      throw new Error("blocked");
    },
    getItem() {
      throw new Error("blocked");
    },
    key() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
}

function placeholderNames(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("i18n locale resolution", () => {
  it("keeps the required locale allowlist exact", () => {
    expect(locales.map((locale) => locale.id)).toEqual(["en", "zh-Hans", "zh-Hant", "ja", "ko", "es"]);
  });

  it.each([
    ["en-US", "en"],
    ["zh-CN", "zh-Hans"],
    ["zh-SG", "zh-Hans"],
    ["zh-TW", "zh-Hant"],
    ["zh-HK", "zh-Hant"],
    ["ja-JP", "ja"],
    ["ko-KR", "ko"],
    ["es-MX", "es"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });

  it("returns null for unsupported locales", () => {
    expect(normalizeLocale("fr-FR")).toBeNull();
  });

  it("prefers stored locale, then browser locale, then default locale", () => {
    expect(resolveLocale("es", ["zh-CN"])).toBe("es");
    expect(resolveLocale("fr-FR", ["zh-TW", "en-US"])).toBe("zh-Hant");
    expect(resolveLocale(null, ["fr-FR"])).toBe(defaultLocale);
  });

  it("interpolates translation parameters", () => {
    expect(translate("en", "headerStats", { colors: 3, total: 2704 })).toBe("3 Colors / Total 2704 Beads");
  });
});

describe("i18n dictionary coverage", () => {
  it("keeps all locale dictionaries aligned with English keys", () => {
    const englishKeys = Object.keys(messages.en).sort();

    for (const locale of locales) {
      expect(Object.keys(messages[locale.id]).sort()).toEqual(englishKeys);
    }
  });

  it("keeps interpolation placeholders aligned across locales", () => {
    for (const [key, englishMessage] of Object.entries(messages.en)) {
      const englishPlaceholders = placeholderNames(englishMessage);

      for (const locale of locales) {
        expect(placeholderNames(messages[locale.id][key as keyof typeof messages.en])).toEqual(englishPlaceholders);
      }
    }
  });

  it("provides localized palette labels for every non-English locale", () => {
    for (const locale of locales.filter((item) => item.id !== "en")) {
      for (const color of mardPalette) {
        expect(paletteLabels[locale.id][color.code]).toBeTruthy();
        expect(getPaletteLabel(locale.id, color)).toBe(paletteLabels[locale.id][color.code]);
      }
    }
  });

  it("provides theme labels for every locale and theme id", () => {
    for (const locale of locales) {
      for (const theme of themes) {
        expect(themeLabels[locale.id][theme.id]).toBeTruthy();
        expect(getThemeLabel(locale.id, theme.id)).toBe(themeLabels[locale.id][theme.id]);
      }
    }
  });
});

describe("theme contract", () => {
  it("keeps the required theme allowlist exact", () => {
    expect(themes.map((theme) => theme.id)).toEqual(["classic", "midnight", "ocean", "candy", "mono"]);
  });

  it("normalizes supported theme ids", () => {
    expect(normalizeTheme("midnight")).toBe("midnight");
    expect(normalizeTheme("unknown")).toBeNull();
    expect(normalizeTheme(null)).toBeNull();
  });

  it("keeps theme ids unique and includes the default theme", () => {
    const themeIds = new Set(themes.map((theme) => theme.id));

    expect(themeIds.size).toBe(themes.length);
    expect(themeIds.has(defaultTheme)).toBe(true);
  });

  it("treats preference storage as optional", () => {
    const storage = throwingStorage();

    expect(
      getLocalStorage({
        get localStorage(): Storage {
          throw new Error("blocked");
        },
      }),
    ).toBeUndefined();
    expect(readStoredLocale(storage)).toBeNull();
    expect(() => writeStoredLocale(storage, "en")).not.toThrow();
    expect(readStoredTheme(storage)).toBeNull();
    expect(() => writeStoredTheme(storage, "classic")).not.toThrow();
  });
});

describe("client-only source guard", () => {
  it("does not introduce remote network or telemetry APIs", () => {
    const sourceFiles = [
      ["App.tsx", appSource],
      ["browser-storage.ts", browserStorageSource],
      ["i18n.tsx", i18nSource],
      ["main.tsx", mainSource],
      ["themes.tsx", themesSource],
    ] as const;
    const forbiddenPatterns = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bsendBeacon\b/, /https?:\/\//, /\btelemetry\b/i, /\bcdn\b/i];

    for (const [sourceFile, source] of sourceFiles) {
      for (const pattern of forbiddenPatterns) {
        expect(source, `${sourceFile} should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
