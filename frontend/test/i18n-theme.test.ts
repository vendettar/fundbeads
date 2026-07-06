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
import patternEditSource from "../src/pattern-edit.ts?raw";
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
import { mardPalette, type BeadColor } from "../src/palette";
import { defaultTheme, normalizeTheme, readStoredTheme, themes, writeStoredTheme } from "../src/themes";
import { formatColorUsageLine, formatColorUsageList, getNextPreferenceOptionIndex, getPreferenceMenuPlacement, isAcceptedImageFile } from "../src/App";

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

function sourceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end < 0) {
    return "";
  }
  return source.slice(start, end);
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
      ["pattern-edit.ts", patternEditSource],
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

  it("wraps the top action cluster instead of clipping the rightmost control", () => {
    expect(appSource).toContain("flex max-w-full flex-wrap items-center gap-2 p-1 xl:justify-end");
    expect(appSource).not.toContain("overflow-x-auto");
    expect(appSource).not.toContain("mx-[-4px]");
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
    const preferenceSelectSource = sourceBetween(appSource, "function PreferenceSelect", "function UploadWorkspace");

    expect(appSource).toContain("createPortal");
    expect(appSource).toContain("preference-select-menu");
    expect(appSource).toContain("aria-haspopup=\"listbox\"");
    expect(preferenceSelectSource).not.toContain("<select");
    expect(preferenceSelectSource).not.toContain("<option");
  });
});

describe("color usage detail contract", () => {
  const usagePattern = {
    width: 2,
    height: 2,
    cells: [],
    usage: [
      { color: mardPalette[0], count: 3 },
      { color: mardPalette[1], count: 1 },
    ],
    totalBeads: 4,
  };
  const labelForColor = (color: BeadColor) => `Label ${color.code}`;
  const formatNumber = (value: number) => String(value);

  it("formats a copyable per-color usage list", () => {
    expect(formatColorUsageList(usagePattern, labelForColor, formatNumber)).toBe(
      [
        "Fundbeads Pattern 2x2 / 2 Colors / Total 4 Beads",
        "Code\tCount\tPercent",
        `${mardPalette[0].code}\t3\t75.0%`,
        `${mardPalette[1].code}\t1\t25.0%`,
      ].join("\n"),
    );
  });

  it("formats a copyable single-color usage line", () => {
    expect(formatColorUsageLine(usagePattern.usage[0], usagePattern.totalBeads, labelForColor, formatNumber)).toBe(`${mardPalette[0].code} x3 (75.0%)`);
  });

  it("renders per-color details with DOM-scoped hover filtering and clipboard actions", () => {
    expect(appSource).toContain("const patternGridRef = useRef<HTMLDivElement>(null)");
    expect(appSource).toContain("const pinnedColorCodeRef = useRef<string | null>(null)");
    expect(appSource).toContain("const setGridFocusedColorCode = useCallback((colorCode: string | null) => {");
    expect(appSource).toContain("const handlePreviewColorChange = useCallback");
    expect(appSource).toContain("(colorCode: string | null) => {");
    expect(appSource).toContain("if (pinnedColorCodeRef.current !== null) {");
    expect(appSource).toContain("const handlePinnedColorToggle = useCallback");
    expect(appSource).toContain("(colorCode: string) => {");
    expect(appSource).toContain("const nextPinnedColorCode = pinnedColorCodeRef.current === colorCode ? null : colorCode");
    expect(appSource).toContain("pinnedColorCodeRef.current = nextPinnedColorCode");
    expect(appSource).toContain("return nextPinnedColorCode");
    expect(appSource).toContain("grid.dataset.focusedColorCode = colorCode");
    expect(appSource).toContain("delete grid.dataset.focusedColorCode");
    expect(appSource).toContain("pinnedColorCodeRef.current = null");
    expect(appSource).toContain("onPreviewColorChange={handlePreviewColorChange}");
    expect(appSource).toContain("onPinnedColorToggle={handlePinnedColorToggle}");
    expect(appSource).not.toContain("const [focusedColorCode, setFocusedColorCode] = useState<string | null>(null)");
    expect(appSource).not.toContain("focusedColorCode={");
    expect(appSource).toContain("data-color-code={cell.color.code}");
    expect(appSource).toContain("pattern-focus-rules");
    expect(appSource).toContain("data-focused-color-code");
    expect(appSource).toContain("function ColorUsageDetail");
    expect(appSource).toContain("onMouseEnter={() => onPreviewColorChange(color.code)}");
    expect(appSource).toContain("onFocus={() => onPreviewColorChange(color.code)}");
    expect(appSource).toContain("function togglePinnedColor(colorCode: string)");
    expect(appSource).toContain("onClick={() => togglePinnedColor(color.code)}");
    expect(appSource).toContain("aria-pressed={isPinned}");
    expect(appSource).toContain("onKeyDown={(event) => {");
    expect(appSource).toContain("navigator.clipboard.writeText");
    expect(appSource).toContain("formatColorUsageList");
    expect(appSource).toContain("formatColorUsageLine");
    expect(appSource).toContain("copyList");
    expect(appSource).toContain("copyColorLine");
    expect(appSource).toContain("colorColumn");
    expect(appSource).toContain("percentColumn");
    expect(i18nSource).toContain("colorDetailTitle");
    expect(i18nSource).toContain("copySucceeded");
    expect(i18nSource).toContain("copyFailed");
  });

  it("shows clipboard feedback on the copy control that triggered it", () => {
    expect(appSource).toContain('type CopyFeedbackStatus = "copySucceeded" | "copyFailed"');
    expect(appSource).toContain('target: "list"');
    expect(appSource).toContain('target: "color"; code: string');
    expect(appSource).toContain('copyStatus?.target === "list" && copyStatus.status === "copySucceeded"');
    expect(appSource).toContain('copyStatus?.target === "color" && copyStatus.code === color.code');
    expect(appSource).toContain('copyText(formatColorUsageList(pattern, paletteLabel, formatNumber), { target: "list" })');
    expect(appSource).toContain('copyText(formatColorUsageLine({ color, count }, pattern.totalBeads, paletteLabel, formatNumber), { target: "color", code: color.code })');
    expect(appSource).not.toContain('copyStatusKey === "copySucceeded"');
  });

  it("places per-color details in the right rail directly below the stats card", () => {
    expect(appSource).toContain("function PatternSideRail");
    expect(appSource).toContain("onPreviewColorChange: (colorCode: string | null) => void");
    expect(appSource).toContain("onPinnedColorToggle: (colorCode: string) => string | null");
    expect(appSource).toContain("<PatternStatsCard pattern={pattern} />");
    expect(appSource).toContain('<ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern} onPreviewColorChange={onPreviewColorChange} onPinnedColorToggle={onPinnedColorToggle} compact />');
    expect(appSource.indexOf("<PatternStatsCard pattern={pattern} />")).toBeLessThan(appSource.indexOf('<ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern}'));
    expect(appSource).not.toContain("{pattern ? <ColorSummary");
  });
});

describe("pattern editing source contract", () => {
  it("defines a pure pattern edit contract outside the React component", () => {
    expect(patternEditSource).toContain('export type PatternEditTool = "view" | "paint" | "pick" | "erase" | "replace"');
    expect(patternEditSource).toContain("export type PatternEditOverrideMap = Record<number, string>");
    expect(patternEditSource).toContain("createPatternEditState");
    expect(patternEditSource).toContain("getEffectivePattern");
    expect(patternEditSource).toContain("paintPatternCells");
    expect(patternEditSource).toContain("erasePatternCells");
    expect(patternEditSource).toContain("replacePatternColor");
    expect(patternEditSource).toContain("undoPatternEdit");
    expect(patternEditSource).toContain("redoPatternEdit");
    expect(patternEditSource).toContain("resetPatternEdits");
  });

  it("renders the generated grid from effective pattern edit state", () => {
    expect(appSource).toContain("const [patternEditState, setPatternEditState] = useState<PatternEditState | null>(null)");
    expect(appSource).toContain("const effectivePattern = useMemo(() => (patternEditState ? getEffectivePattern(patternEditState, mardPalette) : null), [patternEditState])");
    expect(appSource).toContain("setPatternEditState(createPatternEditState(nextPattern, mardPalette))");
    expect(appSource).toContain("setPatternEditState(null)");
    expect(appSource).toContain("pattern={effectivePattern}");
    expect(appSource).toContain("PatternSideRail");
    expect(appSource).toContain("onEditStateChange={(updater) => setPatternEditState");
    expect(appSource).not.toContain("const [pattern, setPattern] = useState<Pattern | null>(null)");
  });

  it("keeps the edit toolbar in the generated pattern area with explicit tool and color state", () => {
    const gridSource = sourceBetween(appSource, "function PatternGrid", "function Row");
    const leftToolbarSource = sourceBetween(appSource, "function PatternLongestEdgeToolbar", "function PatternLongestEdgeControl");

    expect(gridSource).toContain("pattern-edit-toolbar");
    expect(gridSource).toContain("aria-label={t(\"patternEditToolbar\")}");
    expect(gridSource).toContain("editState.tool");
    expect(gridSource).toContain("editState.activeColorCode");
    expect(gridSource).toContain("patternEditActiveColor");
    expect(gridSource).toContain("patternEditReplaceSource");
    expect(gridSource).toContain("patternEditReplaceTarget");
    expect(leftToolbarSource).not.toContain("pattern-edit-toolbar");
    expect(leftToolbarSource).not.toContain("patternEditPaint");
  });

  it("uses delegated pointer editing without per-cell edit callbacks", () => {
    expect(appSource).toContain("data-cell-index={cellIndex}");
    expect(appSource).toContain("data-x={cell.x}");
    expect(appSource).toContain("data-y={cell.y}");
    expect(appSource).toContain("onPointerDown={onBoardPointerDown}");
    expect(appSource).toContain("event.isPrimary");
    expect(appSource).toContain("event.button !== 0");
    expect(appSource).toContain("document.elementFromPoint(event.clientX, event.clientY)");
    expect(appSource).toContain("strokeRef.current");
    expect(appSource).toContain("setPointerCapture");
    expect(appSource).toContain("paintPatternCells(currentState, cellIndexes, currentState.activeColorCode, mardPalette)");
    expect(appSource).toContain("erasePatternCells(currentState, cellIndexes)");
    expect(appSource).toContain("viewport.addEventListener(\"wheel\", onWheel, { passive: false })");
  });

  it("interpolates and clears pointer strokes so fast drags do not skip grid cells", () => {
    expect(appSource).toContain("function collectStrokeCellIndexes");
    expect(appSource).toContain("const previousCellIndex = stroke.lastCellIndex");
    expect(appSource).toContain("const nextCellIndexes = collectStrokeCellIndexes(previousCellIndex, cellIndex, pattern.width)");
    expect(appSource).toContain("stroke.lastCellIndex = cellIndex");
    expect(appSource).toContain("onPointerLeave={onBoardPointerLeave}");
    expect(appSource).toContain("return () => {");
    expect(appSource).toContain("strokeRef.current = null");
  });

  it("defaults replace source from active color and renders replace swatches", () => {
    expect(appSource).toContain("setReplaceSourceCode(pickedColorCode)");
    expect(appSource).toContain("setReplaceSourceCode(colorCode)");
    expect(appSource).toContain("const replaceSourceColor = pattern.usage.find(({ color }) => color.code === replaceSourceCode)?.color");
    expect(appSource).toContain("const replaceTargetColor = mardPalette.find((color) => color.code === replaceTargetCode)");
    expect(appSource).toContain("backgroundColor: replaceSourceColor ? `rgb(${replaceSourceColor.r} ${replaceSourceColor.g} ${replaceSourceColor.b})` : \"transparent\"");
    expect(appSource).toContain("backgroundColor: replaceTargetColor ? `rgb(${replaceTargetColor.r} ${replaceTargetColor.g} ${replaceTargetColor.b})` : \"transparent\"");
  });

  it("provides pattern edit labels for every supported locale", () => {
    const editKeys = [
      "patternEditToolbar",
      "patternEditView",
      "patternEditPaint",
      "patternEditPick",
      "patternEditErase",
      "patternEditReplace",
      "patternEditActiveColor",
      "patternEditUndo",
      "patternEditRedo",
      "patternEditReset",
      "patternEditReplaceSource",
      "patternEditReplaceTarget",
      "patternEditApplyReplace",
      "patternEditReplaceNoSource",
    ] as const;

    for (const locale of locales) {
      for (const key of editKeys) {
        expect(messages[locale.id][key]).toBeTruthy();
      }
    }
  });
});

describe("upload workflow source contracts", () => {
  it("accepts JPG, PNG, and WebP uploads with MIME and extension fallbacks", () => {
    expect(isAcceptedImageFile({ name: "photo.jpg", type: "image/jpeg" })).toBe(true);
    expect(isAcceptedImageFile({ name: "photo.png", type: "image/png" })).toBe(true);
    expect(isAcceptedImageFile({ name: "photo.webp", type: "image/webp" })).toBe(true);
    expect(isAcceptedImageFile({ name: "camera.WEBP", type: "" })).toBe(true);
    expect(isAcceptedImageFile({ name: "notes.txt", type: "text/plain" })).toBe(false);
    expect(isAcceptedImageFile({ name: "vector.svg", type: "image/svg+xml" })).toBe(false);

    expect(appSource).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(appSource).toContain("isAcceptedImageFile(file)");
    expect(i18nSource).toContain("JPG / PNG / WebP");
    expect(i18nSource).not.toContain("JPG/PNG");
  });

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
    expect(appSource).toContain(": effectivePattern ?? fallbackDimensions");
    expect(appSource).toContain("patternLongestEdgePresets.map");
    expect(occurrenceCount(appSource, 'type="range"')).toBe(3);
    expect(appSource).toContain("<PatternLongestEdgeControl");
    expect(appSource).not.toContain("<PatternDimensionControl");
    expect(appSource).toContain("min={patternDimensionMin}");
    expect(appSource).toContain("max={patternDimensionMax}");
    expect(appSource).toContain("step={1}");
    expect(appSource).toContain("patternLongestEdge");
    expect(appSource).toContain("refreshPreview: false");
    expect(i18nSource).toContain("patternLongestEdge");
    expect(i18nSource).toContain("{width}x{height}");
  });

  it("renders the three longest-edge presets in one horizontal row", () => {
    expect(appSource).toContain("mt-3 grid grid-cols-3 gap-2");
    expect(appSource).not.toContain("mt-3 grid gap-2");
  });

  it("renders color mapping controls in the left parameter toolbar", () => {
    expect(patternSource).toContain('colorDistanceModes = ["oklab", "rgb-fast", "weighted-rgb", "lab-delta-e"]');
    expect(patternSource).toContain('ditherModes = ["off", "floyd-steinberg", "ordered"]');
    expect(patternSource).toContain("maxColorCountMin = 2");
    expect(patternSource).toContain("maxColorCountMax = 64");
    expect(patternSource).toContain("defaultMaxColorCount: MaxColorCount = 24");
    expect(patternSource).toContain('defaultColorDistanceMode: ColorDistanceMode = "oklab"');
    expect(patternSource).toContain('defaultDitherMode: DitherMode = "off"');
    expect(appSource).toContain("function PatternAdjustmentControls");
    expect(appSource).toContain("colorDistanceModes.map");
    expect(appSource).toContain("ditherModes.map");
    expect(appSource).not.toContain("colorMatchingModes.map");
    expect(appSource).not.toContain("maxColorCountOptions.map");
    expect(appSource).toContain("min={maxColorCountMin}");
    expect(appSource).toContain("max={maxColorCountMax}");
    expect(appSource).toContain("decreaseMaxColorCount");
    expect(appSource).toContain("increaseMaxColorCount");
    expect(appSource).toContain("onPatternAdjustmentChange");
    expect(appSource).toContain("schedulePatternReprocess(longestEdge, normalizedOptions)");
    expect(appSource).toContain("processingOptions: nextProcessingOptions");
    expect(i18nSource).toContain("colorDistanceModeOklab");
    expect(i18nSource).toContain("colorDistanceModeLabDeltaE");
    expect(i18nSource).toContain("ditherModeFloydSteinberg");
    expect(i18nSource).toContain("ditherModeOrdered");
    expect(i18nSource).toContain("maxColorCountValue");
  });

  it("renders color distance and dither controls with internal preference selects", () => {
    const colorDistanceSource = sourceBetween(appSource, 't("colorDistanceMode")', 't("ditherMode")');
    const ditherModeSource = sourceBetween(appSource, 't("ditherMode")', 't("smoothingLevel")');

    expect(appSource).toContain("description?: string");
    expect(appSource).toContain("describedBy?: string");
    expect(colorDistanceSource).toContain("<PreferenceSelect");
    expect(colorDistanceSource).toContain("value={colorDistanceMode}");
    expect(colorDistanceSource).toContain("normalizeColorDistanceMode(value)");
    expect(colorDistanceSource).toContain("selectedLabel: getColorDistanceModeLabel(mode, t)");
    expect(colorDistanceSource).toContain("displayLabel: colorDistanceModeShortLabels[mode]");
    expect(colorDistanceSource).toContain("description: getColorDistanceModeDescription(mode, t)");
    expect(colorDistanceSource).toContain("describedBy={colorDistanceDescriptionId}");
    expect(colorDistanceSource).not.toContain("<select");
    expect(colorDistanceSource).not.toContain("color-distance-select");
    expect(colorDistanceSource).not.toContain("color-distance-options");
    expect(ditherModeSource).toContain("<PreferenceSelect");
    expect(ditherModeSource).toContain("value={ditherMode}");
    expect(ditherModeSource).toContain("normalizeDitherMode(value)");
    expect(ditherModeSource).toContain("selectedLabel: getDitherModeLabel(mode, t)");
    expect(ditherModeSource).toContain("displayLabel: ditherModeShortLabels[mode]");
    expect(ditherModeSource).toContain("description: getDitherModeDescription(mode, t)");
    expect(ditherModeSource).toContain("describedBy={ditherDescriptionId}");
    expect(ditherModeSource).not.toContain("<select");
    expect(ditherModeSource).not.toContain("dither-mode-select");
    expect(ditherModeSource).not.toContain("dither-mode-options");
  });

  it("includes the selected value in internal preference select trigger labels", () => {
    const preferenceSelectSource = sourceBetween(appSource, "function PreferenceSelect", "function UploadWorkspace");
    const triggerButtonSource = sourceBetween(preferenceSelectSource, "<button", "</button>");

    expect(preferenceSelectSource).toContain("buttonAriaLabel");
    expect(preferenceSelectSource).toContain('`${label}: ${selectedLabel}`');
    expect(triggerButtonSource).toContain("aria-label={buttonAriaLabel}");
    expect(triggerButtonSource).toContain("aria-describedby={describedBy}");
    expect(triggerButtonSource).not.toContain("aria-label={label}");
  });

  it("explains how color distance and dither choices affect the generated pattern", () => {
    const controlsSource = sourceBetween(appSource, "function PatternAdjustmentControls", "function getColorDistanceModeLabel");
    const preferenceSelectSource = sourceBetween(appSource, "function PreferenceSelect", "function UploadWorkspace");
    const colorDistanceSource = sourceBetween(appSource, 't("colorDistanceMode")', 't("ditherMode")');
    const ditherModeSource = sourceBetween(appSource, 't("ditherMode")', 't("smoothingLevel")');

    expect(messages.en.colorDistanceModeHint).toContain("nearest MARD color");
    expect(messages.en.colorDistanceModeOklabDescription).toContain("Default");
    expect(messages.en.colorDistanceModeRgbFastDescription).toContain("icons");
    expect(messages.en.colorDistanceModeWeightedRgbDescription).toContain("natural");
    expect(messages.en.colorDistanceModeLabDeltaEDescription).toContain("photos");
    expect(messages.en.ditherModeHint).toContain("neighboring beads");
    expect(messages.en.ditherModeOffDescription).toMatch(/clean/i);
    expect(messages.en.ditherModeFloydSteinbergDescription).toContain("Gradients, photos, and skin tones");
    expect(messages.en.ditherModeOrderedDescription).toContain("patterned texture");
    expect(messages["zh-Hans"].colorDistanceModeLabDeltaE).toBe("Lab 色差");
    expect(messages["zh-Hans"].ditherModeFloydSteinbergDescription).toContain("渐变、照片、肤色");
    expect(messages["zh-Hant"].colorDistanceModeLabDeltaE).toBe("Lab 色差");
    expect(messages["zh-Hant"].ditherModeFloydSteinbergDescription).toContain("漸層、照片、膚色");

    expect(controlsSource).toContain("const colorDistanceDescriptionId = useId()");
    expect(controlsSource).toContain("const ditherDescriptionId = useId()");
    expect(controlsSource).toContain("const colorDistanceDescription = getColorDistanceModeDescription(colorDistanceMode, t)");
    expect(controlsSource).toContain("const ditherDescription = getDitherModeDescription(ditherMode, t)");
    expect(colorDistanceSource).toContain("description: getColorDistanceModeDescription(mode, t)");
    expect(colorDistanceSource).toContain("id={colorDistanceDescriptionId}");
    expect(colorDistanceSource).toContain("{colorDistanceDescription}");
    expect(ditherModeSource).toContain("description: getDitherModeDescription(mode, t)");
    expect(ditherModeSource).toContain("id={ditherDescriptionId}");
    expect(ditherModeSource).toContain("{ditherDescription}");
    expect(preferenceSelectSource).toContain("option.description");
    expect(preferenceSelectSource).toContain("{option.description}");
  });

  it("opens MARD palette details from the top action instead of the empty homepage", () => {
    expect(appSource).toContain("isPaletteOpen");
    expect(appSource).toContain("setIsPaletteOpen(true)");
    expect(appSource).toContain("function PaletteDialog");
    expect(appSource).toContain('aria-modal="true"');
    expect(appSource).toContain("isPaletteOpen ? <PaletteDialog");
    expect(appSource).not.toContain("pattern ? <ColorSummary pattern={pattern}");
    expect(appSource).not.toContain("pattern ? <ColorSummary pattern={pattern} /> : <MardPaletteShowcase />");
    expect(i18nSource).toContain("closeDialog");
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

  it("keeps the original preview, compact stats, and scrollable details in the right rail", () => {
    expect(appSource).toContain("function PatternSideRail");
    expect(appSource).toContain("function PatternStatsCard");
    expect(appSource).toContain("xl:self-stretch");
    expect(appSource).toContain("grid-rows-[auto_auto_minmax(0,1fr)]");
    expect(appSource).toContain("overflow-hidden");
    expect(appSource).toContain("xl:h-full");
    expect(appSource).toContain("xl:min-h-0");
    expect(appSource).toContain("<PatternStatsCard pattern={pattern} />");
    expect(appSource).toContain('<ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern} onPreviewColorChange={onPreviewColorChange} onPinnedColorToggle={onPinnedColorToggle} compact />');
    expect(appSource.indexOf("<ImagePreview")).toBeLessThan(appSource.indexOf("<PatternStatsCard"));
    expect(appSource.indexOf("<PatternStatsCard")).toBeLessThan(appSource.indexOf("<ColorUsageDetail"));
    expect(appSource).not.toContain("mt-3 grid min-h-56 place-items-center bg-background");
  });
});
