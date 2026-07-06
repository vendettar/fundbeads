/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import appSource from "../src/App.tsx?raw";
import browserStorageSource from "../src/browser-storage.ts?raw";
import i18nSource from "../src/i18n.tsx?raw";
import interfaceStyleSource from "../src/interface-style.tsx?raw";
import localPatternDbSource from "../src/local-pattern-db.ts?raw";
import mainSource from "../src/main.tsx?raw";
import paletteSource from "../src/palette.ts?raw";
import mardPaletteSource from "../src/palettes/mard.ts?raw";
import patternSource from "../src/pattern.ts?raw";
import themesSource from "../src/themes.tsx?raw";
import { getLocalStorage } from "../src/browser-storage";
import {
  defaultLocale,
  getInterfaceStyleLabel,
  getPaletteLabel,
  getThemeLabel,
  interfaceStyleLabels,
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
import {
  defaultInterfaceStyle,
  interfaceStyleStorageKey,
  interfaceStyles,
  normalizeInterfaceStyle,
  readStoredInterfaceStyle,
  writeStoredInterfaceStyle,
} from "../src/interface-style";
import { mardPalette } from "../src/palette";
import { defaultTheme, normalizeTheme, readStoredTheme, themes, writeStoredTheme } from "../src/themes";
import { getNextPreferenceOptionIndex, getPreferenceMenuPlacement } from "../src/App";

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

function occurrenceCount(source: string, needle: string): number {
  return source.split(needle).length - 1;
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

  it("falls back to stable MARD labels when a locale has no palette label override", () => {
    for (const locale of locales) {
      for (const color of mardPalette) {
        expect(getPaletteLabel(locale.id, color)).toBe(color.label);
      }
    }
  });

  it("uses explicit palette label overrides when present", () => {
    paletteLabels["zh-Hans"].A1 = "测试色名";

    try {
      expect(getPaletteLabel("zh-Hans", mardPalette[0])).toBe("测试色名");
    } finally {
      delete paletteLabels["zh-Hans"].A1;
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

  it("provides interface style labels for every locale and style id", () => {
    for (const locale of locales) {
      for (const style of interfaceStyles) {
        expect(interfaceStyleLabels[locale.id][style.id]).toBeTruthy();
        expect(getInterfaceStyleLabel(locale.id, style.id)).toBe(interfaceStyleLabels[locale.id][style.id]);
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

describe("interface style contract", () => {
  it("keeps the required interface style allowlist exact", () => {
    expect(interfaceStyles.map((style) => style.id)).toEqual(["modern", "pixel"]);
  });

  it("uses modern as the default interface style", () => {
    expect(defaultInterfaceStyle).toBe("modern");
  });

  it("normalizes supported interface style ids", () => {
    expect(normalizeInterfaceStyle("modern")).toBe("modern");
    expect(normalizeInterfaceStyle("pixel")).toBe("pixel");
    expect(normalizeInterfaceStyle("unknown")).toBeNull();
    expect(normalizeInterfaceStyle(null)).toBeNull();
    expect(normalizeInterfaceStyle(undefined)).toBeNull();
  });

  it("keeps interface style ids unique and includes the default style", () => {
    const styleIds = new Set(interfaceStyles.map((style) => style.id));

    expect(styleIds.size).toBe(interfaceStyles.length);
    expect(styleIds.has(defaultInterfaceStyle)).toBe(true);
  });

  it("uses a stable namespaced storage key", () => {
    expect(interfaceStyleStorageKey).toBe("fundbeads.interfaceStyle");
  });

  it("treats interface style storage as optional", () => {
    const storage = throwingStorage();

    expect(readStoredInterfaceStyle(storage)).toBeNull();
    expect(() => writeStoredInterfaceStyle(storage, "modern")).not.toThrow();
  });
});

describe("client-only source guard", () => {
  it("does not introduce remote network or telemetry APIs", () => {
    const sourceFiles = [
      ["App.tsx", appSource],
      ["browser-storage.ts", browserStorageSource],
      ["i18n.tsx", i18nSource],
      ["interface-style.tsx", interfaceStyleSource],
      ["local-pattern-db.ts", localPatternDbSource],
      ["main.tsx", mainSource],
      ["palette.ts", paletteSource],
      ["palettes/mard.ts", mardPaletteSource],
      ["pattern.ts", patternSource],
      ["themes.tsx", themesSource],
    ] as const;
    const forbiddenPatterns = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bsendBeacon\b/, /https?:\/\//, /\btelemetry\b/i, /\bcdn\b/i];

    for (const [sourceFile, source] of sourceFiles) {
      for (const pattern of forbiddenPatterns) {
        expect(source, `${sourceFile} should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("keeps local pattern persistence free of account authority concepts", () => {
    const forbiddenPatterns = [/\bpassword\b/i, /\bsession\b/i, /\btoken\b/i, /\bauth\b/i, /\blogin\b/i, /\bemail\b/i];

    for (const pattern of forbiddenPatterns) {
      expect(localPatternDbSource, `local-pattern-db.ts should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});

describe("interface style source contracts", () => {
  it("wraps the app with the interface style provider", () => {
    expect(mainSource).toContain("InterfaceStyleProvider");
  });

  it("applies the interface style to the document element dataset", () => {
    expect(appSource).toContain("document.documentElement.dataset.uiStyle");
  });

  it("renders the interface style selector in the preference cluster", () => {
    expect(appSource).toContain("interfaceStyleLabel");
    expect(appSource).toContain("interfaceStyles.map");
  });
});

describe("preference dropdown contract", () => {
  it("positions custom preference menus below the trigger", () => {
    const placement = getPreferenceMenuPlacement({ bottom: 42, left: 12, width: 80 });

    expect(placement.top).toBeGreaterThan(42);
    expect(placement.left).toBe(12);
    expect(placement.minWidth).toBe(96);
  });

  it("wraps keyboard navigation through available preference options", () => {
    expect(getNextPreferenceOptionIndex(0, 1, 3)).toBe(1);
    expect(getNextPreferenceOptionIndex(2, 1, 3)).toBe(0);
    expect(getNextPreferenceOptionIndex(0, -1, 3)).toBe(2);
    expect(getNextPreferenceOptionIndex(0, 1, 0)).toBe(0);
  });

  it("uses a styled custom menu instead of native select options", () => {
    expect(appSource).toContain("createPortal");
    expect(appSource).toContain("preference-select-menu");
    expect(appSource).toContain("aria-haspopup=\"listbox\"");
    expect(appSource).not.toContain("<select");
    expect(appSource).not.toContain("<option");
  });
});

describe("upload workflow source contracts", () => {
  it("moves aspect-ratio output controls into a left workspace toolbar matching the preview rail", () => {
    expect(appSource).toContain("function PatternLongestEdgeToolbar");
    expect(appSource).toContain("grid-size-toolbar");
    expect(appSource).toContain("xl:grid-cols-[260px_minmax(0,1fr)_260px]");
    expect(appSource).toContain("xl:grid-cols-[260px_minmax(0,1fr)]");
    expect(appSource.indexOf("function PatternLongestEdgeToolbar")).toBeGreaterThan(appSource.indexOf("return ("));
    expect(appSource.indexOf("function PatternLongestEdgeToolbar")).toBeLessThan(appSource.indexOf("function PreferenceSelect"));
  });

  it("renders a longest-edge slider with derived output dimensions", () => {
    expect(patternSource).toContain("patternDimensionMin = 40");
    expect(patternSource).toContain("patternDimensionMax = 100");
    expect(patternSource).toContain("patternLongestEdgePresets");
    expect(patternSource).toContain("dimensionsForAspectRatio");
    expect(patternSource).toContain("PatternDimensions");
    expect(patternSource).not.toContain("type GridSize");
    expect(patternSource).not.toContain("size: GridSize");
    expect(appSource).not.toContain("GridSize");
    expect(appSource).not.toContain("gridSizes");
    expect(appSource).not.toContain("pattern.size");

    expect(appSource).toContain("longestEdge");
    expect(appSource).toContain("sourceImageSize");
    expect(appSource).toContain("setSourceImageSize");
    expect(appSource).toContain("dimensionsForAspectRatio(sourceImageSize, longestEdge)");
    expect(appSource).toContain(": pattern ?? fallbackDimensions");
    expect(appSource).toContain("patternLongestEdgePresets.map");
    expect(occurrenceCount(appSource, 'type="range"')).toBe(1);
    expect(appSource).toContain("<PatternLongestEdgeControl");
    expect(appSource).not.toContain("<PatternDimensionControl");
    expect(appSource).toContain("min={patternDimensionMin}");
    expect(appSource).toContain("max={patternDimensionMax}");
    expect(appSource).toContain("step={1}");
    expect(appSource).toContain("patternLongestEdge");
    expect(appSource).toContain("outputDimensions");
    expect(appSource).toContain("refreshPreview: false");
    expect(i18nSource).toContain("patternLongestEdge");
    expect(i18nSource).toContain("outputDimensions");
    expect(i18nSource).toContain("{width}x{height}");
  });

  it("keeps dropped files available for resolution changes", () => {
    expect(appSource).toContain("activeFileRef");
    expect(appSource).toContain("activeFileRef.current");
  });

  it("guards async pattern updates against stale upload results", () => {
    expect(appSource).toContain("processRunIdRef");
    expect(appSource).toContain("processRunIdRef.current");
  });

  it("invalidates pending pattern work before rejecting unsupported files", () => {
    expect(appSource).toContain("const processRunId = processRunIdRef.current + 1");
    expect(appSource.indexOf("const processRunId = processRunIdRef.current + 1")).toBeLessThan(appSource.indexOf('setErrorKey("unsupportedImage")'));
  });

  it("does not recreate the original preview when only resolution changes", () => {
    expect(appSource).toContain("refreshPreview");
    expect(appSource).toContain("refreshPreview: false");
  });

  it("exposes the dropzone with button semantics", () => {
    expect(appSource).toContain('role="button"');
    expect(appSource).toContain("aria-describedby");
  });

  it("renders the empty upload state as an image preview placeholder", () => {
    expect(appSource).toContain("upload-preview-placeholder");
    expect(appSource).toContain("upload-preview-canvas");
    expect(appSource).toContain("upload-preview-frame");
  });

  it("keeps the original preview rail content-height sized with compact stats below it", () => {
    expect(appSource).toContain("function PatternSideRail");
    expect(appSource).toContain("function PatternStatsCard");
    expect(appSource).toContain("self-start");
    expect(appSource).toContain("h-fit");
    expect(appSource).toContain("<PatternStatsCard pattern={pattern} />");
    expect(appSource.indexOf("<ImagePreview")).toBeLessThan(appSource.indexOf("<PatternStatsCard"));
    expect(appSource).not.toContain("mt-3 grid min-h-56 place-items-center bg-background");
  });
});
