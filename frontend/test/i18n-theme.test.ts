/// <reference types="vite/client" />

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import appSource from "../src/App.tsx?raw";
import colorMatchingSource from "../src/color-matching.ts?raw";
import colorUsageDetailSource from "../src/color-usage-detail.tsx?raw";
import ditherSource from "../src/dither.ts?raw";
import imageFileToPatternSource from "../src/image-file-to-pattern.browser.ts?raw";
import imageFileToPatternWorkerSource from "../src/image-file-to-pattern.worker.ts?raw";
import i18nDataSource from "../src/i18n-data.ts?raw";
import i18nSource from "../src/i18n.tsx?raw";
import interfaceStyleSource from "../src/interface-style.tsx?raw";
import mainSource from "../src/main.tsx?raw";
import maxColorSource from "../src/max-color.ts?raw";
import paletteDialogSource from "../src/palette-dialog.tsx?raw";
import patternDimensionsSource from "../src/pattern-dimensions.ts?raw";
import patternEditToolbarSource from "../src/pattern-edit-toolbar.tsx?raw";
import patternPreferencesSource from "../src/pattern-preferences.ts?raw";
import patternGridSource from "../src/pattern-grid.tsx?raw";
import patternGridBoardSource from "../src/pattern-grid-board.tsx?raw";
import patternGridInteractionSource from "../src/pattern-grid-interaction.ts?raw";
import patternEditSource from "../src/pattern-edit.ts?raw";
import patternSideRailSource from "../src/pattern-side-rail.tsx?raw";
import patternSource from "../src/pattern.ts?raw";
import preferenceSelectSource from "../src/preference-select.tsx?raw";
import uploadWorkspaceSource from "../src/upload-workspace.tsx?raw";
import usePatternProcessingSource from "../src/use-pattern-processing.ts?raw";
import lastWorkspaceDbSource from "../src/last-workspace-db.ts?raw";
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
import { estimatePreferenceMenuWidth, getNextPreferenceOptionIndex, getPreferenceMenuPlacement } from "../src/preference-select";
import { defaultTheme, normalizeTheme, readStoredTheme, themes, writeStoredTheme } from "../src/themes";
import { formatColorUsageLine, formatColorUsageList } from "../src/color-usage-detail";
import { isAcceptedImageFile, isWithinUploadFileSizeLimit, maxUploadFileSizeBytes } from "../src/use-pattern-processing";

const cssSourceFiles = [
  "styles.css",
  "styles/base.css",
  "styles/components.css",
  "styles/pattern-grid.css",
  "styles/interface-styles.css",
] as const;
const stylesSource = cssSourceFiles.map((filePath) => readFileSync(new URL(`../src/${filePath}`, import.meta.url), "utf8")).join("\n");

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

const expectedInterfaceStyleIds = [
  "modern",
  "pixel",
  "glass-desk",
  "arcade-cabinet",
] as const;

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
    expect(interfaceStyles.map((style) => style.id)).toEqual(expectedInterfaceStyleIds);
  });

  it("uses pixel as the default interface style", () => {
    expect(defaultInterfaceStyle).toBe("pixel");
  });

  it("normalizes supported interface style ids", () => {
    expect(normalizeInterfaceStyle("modern")).toBe("modern");
    expect(normalizeInterfaceStyle("pixel")).toBe("pixel");
    for (const styleId of expectedInterfaceStyleIds) {
      expect(normalizeInterfaceStyle(styleId)).toBe(styleId);
    }
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

  it("uses the specified labels and short labels for new interface styles", () => {
    expect(interfaceStyleLabels["zh-Hans"]["glass-desk"]).toBe("玻璃桌");
    expect(interfaceStyleLabels["zh-Hant"]["arcade-cabinet"]).toBe("街機櫃");
    expect(appSource).toContain('"glass-desk": "GD"');
    expect(appSource).toContain('"arcade-cabinet": "AC"');
  });

  it("treats interface style storage as optional", () => {
    const storage = throwingStorage();

    expect(readStoredInterfaceStyle(storage)).toBeNull();
    expect(() => writeStoredInterfaceStyle(storage, "modern")).not.toThrow();
  });
});

describe("interface style source contracts", () => {
  it("defines a scoped CSS rule for every supported interface style", () => {
    for (const styleId of expectedInterfaceStyleIds.filter((styleId) => styleId !== "modern")) {
      expect(stylesSource).toContain(`[data-ui-style="${styleId}"]`);
    }
  });

  it("keeps interface style CSS away from grid cells, board layout, and remote assets", () => {
    const forbiddenPatterns = [
      /\[data-ui-style=["'][^"']+["']\][^{]*\.pattern-cell/,
      /\[data-ui-style=["'][^"']+["']\][^{]*\.pattern-grid-board[^{]*{[^}]*\b(display|grid|transform|width|height|grid-template-columns)\s*:/s,
      /@import\s+url\(/i,
      /https?:\/\//i,
      /\burl\((?!["']?(?:data:image\/svg\+xml,|\.\.\/assets\/cursors\/cursor-[\w-]+\.svg["']?\s*\)))/i,
      /\bcdn\b/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(stylesSource, `styles.css should not match ${pattern}`).not.toMatch(pattern);
    }
  });

  it("keeps repeated micro typography and grid cell dimensions in named CSS primitives", () => {
    expect(stylesSource).toContain(".text-caption-compact");
    expect(stylesSource).toContain(".text-caption-dense");
    expect(stylesSource).toContain(".preset-label-condensed");
    expect(stylesSource).toContain(".pattern-cell-code");
    expect(stylesSource).toContain(".pattern-axis-label");
    expect(stylesSource).toContain(".pattern-axis-corner");
    expect(stylesSource).toContain(".app-workspace-with-rail");
    expect(stylesSource).toContain(".pattern-grid-viewport");
    expect(stylesSource).toContain(".color-usage-columns-compact");
    expect(stylesSource).toContain(".layer-modal-backdrop");
    expect(appSource).not.toMatch(/\btext-\[[^\]]+\]/);
    expect(appSource).not.toContain("h-[22px]");
    expect(appSource).not.toContain("w-[22px]");
  });

  it("does not draw an inner border on the active grid cell after pointer selection", () => {
    expect(stylesSource).toContain('.pattern-grid-board:focus-visible .pattern-cell[data-keyboard-active="true"]::before');
    expect(stylesSource).not.toMatch(/\.pattern-cell\[data-keyboard-active=["']true["']\][^{]*{[^}]*box-shadow/s);
  });

  it("prevents browser text selection inside the editable pattern grid", () => {
    expect(stylesSource).toContain(".pattern-grid-board,\n.pattern-grid-board .pattern-cell,\n.pattern-grid-board .pattern-axis-label");
    expect(stylesSource).toContain("-webkit-user-select: none;");
    expect(stylesSource).toContain("user-select: none;");
  });

  it("uses explicit tool-themed cursors for every pattern grid mode", () => {
    expect(patternGridBoardSource).toContain("data-edit-tool={editTool}");
    expect(patternGridBoardSource).toContain('data-panning={isPanning ? "true" : undefined}');
    expect(patternGridSource).toContain("isPanning");
    expect(patternGridSource).toContain("canPanPatternGrid");
    expect(patternGridSource).toContain("nextPatternGridPanScroll");
    expect(stylesSource).toContain('.pattern-grid-board[data-edit-tool="view"]');
    expect(stylesSource).toContain('.pattern-grid-board[data-edit-tool="paint"]');
    expect(stylesSource).toContain('.pattern-grid-board[data-edit-tool="pick"]');
    expect(stylesSource).toContain('.pattern-grid-board[data-edit-tool="erase"]');
    expect(stylesSource).toContain('.pattern-grid-board[data-edit-tool="replace"]');
    expect(stylesSource).toContain('.pattern-grid-board[data-panning="true"]');
    expect(stylesSource).toContain('url("../assets/cursors/cursor-view-hand.svg")');
    expect(stylesSource).toContain('url("../assets/cursors/cursor-paintbrush.svg")');
    expect(stylesSource).toContain('url("../assets/cursors/cursor-pipette.svg")');
    expect(stylesSource).toContain('url("../assets/cursors/cursor-eraser.svg")');
  });

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
    const placement = getPreferenceMenuPlacement({ bottom: 42, left: 12, width: 80 }, { innerWidth: 320, innerHeight: 480 });

    expect(placement.top).toBeGreaterThan(42);
    expect(placement.left).toBe(12);
    expect(placement.minWidth).toBe(96);
    expect(placement.width).toBe(96);
    expect(placement.maxHeight).toBeGreaterThan(0);
  });

  it("sizes custom preference menus from the widest option and shifts right-edge menus left", () => {
    const preferredWidth = estimatePreferenceMenuWidth([
      { value: "short", label: "Short", displayLabel: "S" },
      { value: "long", label: "Longest visible option", displayLabel: "L" },
    ]);
    const widePlacement = getPreferenceMenuPlacement({ bottom: 42, left: 12, width: 80 }, { innerWidth: 480, innerHeight: 480 }, preferredWidth);
    const rightEdgePlacement = getPreferenceMenuPlacement({ bottom: 42, left: 280, width: 40 }, { innerWidth: 320, innerHeight: 480 }, preferredWidth);

    expect(preferredWidth).toBeGreaterThan(80);
    expect(widePlacement.width).toBe(preferredWidth);
    expect(widePlacement.left).toBe(12);
    expect(rightEdgePlacement.width).toBe(preferredWidth);
    expect(rightEdgePlacement.left).toBeLessThan(280);
    expect(rightEdgePlacement.left + rightEdgePlacement.width).toBeLessThanOrEqual(312);
  });

  it("keeps English theme and interface option labels visible without truncation", () => {
    const themeMenuWidth = estimatePreferenceMenuWidth([{ value: "midnight", label: "Midnight", displayLabel: "MI" }]);
    const interfaceMenuWidth = estimatePreferenceMenuWidth([{ value: "arcade-cabinet", label: "Arcade Cabinet", displayLabel: "AC" }]);

    expect(themeMenuWidth).toBeGreaterThanOrEqual(140);
    expect(interfaceMenuWidth).toBeGreaterThanOrEqual(200);
  });

  it("clamps custom preference menus to the viewport and flips above bottom-edge triggers", () => {
    const rightEdgePlacement = getPreferenceMenuPlacement({ bottom: 42, left: 280, width: 120 }, { innerWidth: 320, innerHeight: 480 });
    const bottomEdgePlacement = getPreferenceMenuPlacement({ top: 420, bottom: 460, left: 12, width: 120 }, { innerWidth: 320, innerHeight: 480 });

    expect(rightEdgePlacement.left + rightEdgePlacement.minWidth).toBeLessThanOrEqual(312);
    expect(bottomEdgePlacement.top).toBeLessThan(420);
    expect(bottomEdgePlacement.maxHeight).toBeLessThanOrEqual(320);
  });

  it("wraps keyboard navigation through available preference options", () => {
    expect(getNextPreferenceOptionIndex(0, 1, 3)).toBe(1);
    expect(getNextPreferenceOptionIndex(2, 1, 3)).toBe(0);
    expect(getNextPreferenceOptionIndex(0, -1, 3)).toBe(2);
    expect(getNextPreferenceOptionIndex(0, 1, 0)).toBe(0);
  });

  it("uses a styled custom menu instead of native select options", () => {
    expect(preferenceSelectSource).toContain("createPortal");
    expect(preferenceSelectSource).toContain("preference-select-menu");
    expect(preferenceSelectSource).not.toContain("z-50");
    expect(preferenceSelectSource).toContain("aria-haspopup=\"listbox\"");
    expect(preferenceSelectSource).toContain("aria-activedescendant={isOpen ? activeOptionId : undefined}");
    expect(preferenceSelectSource).toContain("aria-activedescendant={activeOptionId}");
    expect(preferenceSelectSource).toContain("id={`${menuId}-option-${optionIndex}`}");
    expect(preferenceSelectSource).toContain("estimatePreferenceMenuWidth(options)");
    expect(preferenceSelectSource).toContain("width: menuPlacement.width");
    expect(preferenceSelectSource).toContain("maxWidth: menuPlacement.maxWidth");
    expect(preferenceSelectSource).toContain('defaultSelectedLabelClassName = "pointer-events-none min-w-6 max-w-24 truncate"');
    expect(preferenceSelectSource).toContain("selectedLabelClassName = defaultSelectedLabelClassName");
    expect(preferenceSelectSource).toContain("className={selectedLabelClassName}");
    expect(preferenceSelectSource).toContain('className="min-w-0 break-words"');
    expect(preferenceSelectSource).not.toContain('className="min-w-0 truncate">{option.label}');
    expect(preferenceSelectSource).toContain('event.key === "Home"');
    expect(preferenceSelectSource).toContain('event.key === "End"');
    expect(preferenceSelectSource).toContain('event.key === "Tab"');
    expect(preferenceSelectSource).toContain("maxHeight: menuPlacement.maxHeight");
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

  it("renders per-color details with indexed DOM highlight and clipboard actions", () => {
    expect(appSource).toContain("const patternGridRef = useRef<HTMLDivElement>(null)");
    expect(appSource).toContain("const [pinnedColorCode, setPinnedColorCode] = useState<string | null>(null)");
    expect(appSource).toContain("const pinnedColorCodeRef = useRef<string | null>(null)");
    expect(appSource).toContain("const patternGridColorCellIndexRef = useRef<Map<string, HTMLElement[]>>(new Map())");
    expect(appSource).toContain("buildPatternGridColorCellIndex");
    expect(appSource).toContain("patternGridColorFocusClassChanges");
    expect(appSource).toContain("requestAnimationFrame");
    expect(appSource).toContain("const applyGridFocusedColorCode = useCallback((colorCode: string | null, options: { force?: boolean } = {}) => {");
    expect(appSource).toContain("const setGridFocusedColorCode = useCallback((colorCode: string | null) => {");
    expect(appSource).toContain("const handlePreviewColorChange = useCallback");
    expect(appSource).toContain("(colorCode: string | null) => {");
    expect(appSource).toContain("if (pinnedColorCodeRef.current !== null) {");
    expect(appSource).toContain("const handlePinnedColorToggle = useCallback");
    expect(appSource).toContain("(colorCode: string) => {");
    expect(appSource).toContain("const nextPinnedColorCode = pinnedColorCodeRef.current === colorCode ? null : colorCode");
    expect(appSource).toContain("pinnedColorCodeRef.current = nextPinnedColorCode");
    expect(appSource).toContain("setPinnedColorCode(nextPinnedColorCode)");
    expect(appSource).toContain('grid.dataset.colorFocus = "active"');
    expect(appSource).toContain("grid.dataset.colorFocusCode = nextColorCode");
    expect(appSource).toContain("delete grid.dataset.colorFocus");
    expect(appSource).toContain("delete grid.dataset.colorFocusCode");
    expect(appSource).toContain('classList.add("is-focused-color")');
    expect(appSource).toContain('classList.remove("is-focused-color")');
    expect(appSource).toContain("const syncPatternGridColorFocus = useCallback");
    expect(appSource).toContain("const nextFocusedColorCode = pinnedColorCodeRef.current ?? focusedColorCodeRef.current");
    expect(appSource).toContain("applyGridFocusedColorCode(nextFocusedColorCode, { force: true })");
    expect(appSource).toContain("onGridDisplayOptionsChange={syncPatternGridColorFocus}");
    expect(appSource).toContain("onPreviewColorChange={handlePreviewColorChange}");
    expect(appSource).toContain("onPinnedColorToggle={handlePinnedColorToggle}");
    expect(appSource).toContain("pinnedColorCode={pinnedColorCode}");
    expect(appSource).toContain("<PatternGrid");
    expect(appSource).toContain("pinnedColorCode={pinnedColorCode}");
    expect(appSource).not.toContain("const [focusedColorCode, setFocusedColorCode] = useState<string | null>(null)");
    expect(appSource).not.toContain("focusedColorCode={");
    expect(appSource).not.toContain("grid.dataset.focusedColorCode");
    expect(appSource).not.toContain("delete grid.dataset.focusedColorCode");
    expect(appSource).not.toContain("pinnedColorCodeRef.current = null;\n    pendingFocusedColorCodeRef.current = null");
    expect(patternGridBoardSource).toContain("data-color-code={cellColor?.code}");
    expect(patternGridBoardSource).toContain("data-cell-index={cellIndex}");
    expect(patternGridBoardSource).toContain("data-color-focus-edited-away={colorFocusEditedAwayMarker?.type}");
    expect(patternGridBoardSource).toContain('data-color-focus-edited-away-code={showCodes && colorFocusEditedAwayMarker?.type === "paint" ? colorFocusEditedAwayMarker.colorCode : undefined}');
    expect(patternGridBoardSource).toContain("--pattern-cell-edited-away-color");
    expect(patternGridBoardSource).toContain("--pattern-cell-edited-away-fg");
    expect(patternGridBoardSource).toContain("--pattern-cell-bg");
    expect(patternGridBoardSource).toContain("--pattern-cell-fg");
    expect(patternGridSource).not.toContain("pattern-focus-rules");
    expect(patternGridSource).toContain("colorFocusEditedAwayCellMarkers");
    expect(patternGridSource).toContain("onGridDisplayOptionsChange");
    expect(patternGridSource).toContain("useLayoutEffect");
    expect(patternGridSource).toContain("[onGridDisplayOptionsChange, previewOptions.showAxes, previewOptions.showCodes, previewOptions.showGrid]");
    expect(patternGridSource).toContain("colorFgCss: readableTextColor(color)");
    expect(patternGridSource).toContain("patternGridColorFocusEditedAwayMarkerChanges");
    expect(patternGridSource).toContain("markColorFocusEditedAwayCells");
    expect(patternGridSource).toContain("setColorFocusEditedAwayCellMarkers(new Map())");
    expect(sourceBetween(patternGridSource, "function applyReplace()", "function applyKeyboardCellEdit")).not.toContain("markColorFocusEditedAwayCells");
    expect(patternGridInteractionSource).not.toContain("data-focused-color-code");
    expect(patternGridInteractionSource).not.toContain("patternGridFocusRules");
    expect(stylesSource).toContain('.pattern-grid-board[data-color-focus="active"] .pattern-cell');
    expect(stylesSource).toContain(".pattern-cell.is-focused-color");
    expect(stylesSource).toContain('.pattern-grid-board[data-color-focus="active"] .pattern-cell[data-color-focus-edited-away="erase"]::after');
    expect(stylesSource).toContain('.pattern-grid-board[data-color-focus="active"] .pattern-cell[data-color-focus-edited-away="paint"]::after');
    expect(stylesSource).toContain("content: attr(data-color-focus-edited-away-code);");
    expect(stylesSource).toContain("color: var(--pattern-cell-edited-away-fg);");
    const paintEditedAwayRule = stylesSource.match(/\.pattern-grid-board\[data-color-focus="active"\] \.pattern-cell\[data-color-focus-edited-away="paint"\]::after\s*\{[^}]+\}/)?.[0] ?? "";
    expect(paintEditedAwayRule).toContain("inset: 0;");
    expect(paintEditedAwayRule).toContain("background: var(--pattern-cell-edited-away-color);");
    expect(stylesSource).not.toMatch(/data-focused-color-code/);
    expect(stylesSource).not.toMatch(/:not\(\[data-color-code/);
    expect(colorUsageDetailSource).toContain("function ColorUsageDetail");
    expect(colorUsageDetailSource).toContain("pinnedColorCode");
    expect(colorUsageDetailSource).not.toContain("const [pinnedColorCode, setPinnedColorCode]");
    expect(colorUsageDetailSource).not.toContain("setPinnedColorCode(null)");
    expect(colorUsageDetailSource).toContain("onMouseEnter={() => onPreviewColorChange(color.code)}");
    expect(colorUsageDetailSource).toContain("onFocus={() => onPreviewColorChange(color.code)}");
    expect(colorUsageDetailSource).toContain("focus-within:bg-muted");
    expect(colorUsageDetailSource).toContain("function togglePinnedColor(colorCode: string)");
    expect(colorUsageDetailSource).toContain("onClick={() => togglePinnedColor(color.code)}");
    expect(colorUsageDetailSource).toContain("aria-pressed={isPinned}");
    expect(colorUsageDetailSource).not.toContain('role="button"');
    expect(colorUsageDetailSource).not.toContain("tabIndex={0}");
    expect(colorUsageDetailSource).not.toContain("onKeyDown={(event) => {");
    expect(colorUsageDetailSource).toContain("navigator.clipboard.writeText");
    expect(colorUsageDetailSource).toContain("formatColorUsageList");
    expect(colorUsageDetailSource).toContain("formatColorUsageLine");
    expect(colorUsageDetailSource).toContain("copyList");
    expect(colorUsageDetailSource).toContain("copyColorLine");
    expect(colorUsageDetailSource).toContain("colorColumn");
    expect(colorUsageDetailSource).toContain("percentColumn");
    expect(i18nDataSource).toContain("colorDetailTitle");
    expect(i18nDataSource).toContain("copySucceeded");
    expect(i18nDataSource).toContain("copyFailed");
    expect(i18nSource).toContain("i18n-data");
  });

  it("places per-color details in the right rail directly below the stats card", () => {
    expect(appSource).toContain('import { PatternSideRail } from "./pattern-side-rail"');
    expect(appSource).toContain("<PatternSideRail");
    expect(appSource).toContain("onPreviewColorChange={handlePreviewColorChange}");
    expect(appSource).toContain("onPinnedColorToggle={handlePinnedColorToggle}");
    expect(patternSideRailSource).toContain("export function PatternSideRail");
    expect(patternSideRailSource).toContain("pinnedColorCode: string | null");
    expect(patternSideRailSource).toContain("onPreviewColorChange: (colorCode: string | null) => void");
    expect(patternSideRailSource).toContain("onPinnedColorToggle: (colorCode: string) => void");
    expect(patternSideRailSource).toContain("<PatternStatsCard pattern={pattern} />");
    expect(patternSideRailSource).toContain("pinnedColorCode={pinnedColorCode}");
    expect(patternSideRailSource).toContain('<ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern} pinnedColorCode={pinnedColorCode} onPreviewColorChange={onPreviewColorChange} onPinnedColorToggle={onPinnedColorToggle} compact />');
    expect(patternSideRailSource.indexOf("<PatternStatsCard pattern={pattern} />")).toBeLessThan(patternSideRailSource.indexOf('<ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern} pinnedColorCode={pinnedColorCode} onPreviewColorChange={onPreviewColorChange} onPinnedColorToggle={onPinnedColorToggle} compact />'));
    expect(appSource).not.toContain("{pattern ? <ColorSummary");
  });
});

describe("pattern editing source contract", () => {
  it("defines a pure pattern edit contract outside the React component", () => {
    expect(patternEditSource).toContain('export type PatternEditTool = "view" | "paint" | "pick" | "erase" | "replace"');
    expect(patternEditSource).toContain("export type PatternEditOverrideMap = Record<number, string | null>");
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
    expect(appSource).toContain('import { PatternGrid } from "./pattern-grid"');
    expect(appSource).not.toContain("const [pattern, setPattern] = useState<Pattern | null>(null)");
  });

  it("keeps the edit toolbar in the generated pattern area with explicit tool and color state", () => {
    const leftToolbarSource = sourceBetween(appSource, "function PatternLongestEdgeToolbar", "function PatternLongestEdgeControl");

    expect(patternGridSource).toContain('import { PatternEditControls } from "./pattern-edit-toolbar"');
    expect(patternGridSource).toContain("<PatternEditControls");
    expect(patternEditToolbarSource).toContain("pattern-edit-toolbar");
    expect(patternEditToolbarSource).toContain("aria-label={t(\"patternEditToolbar\")}");
    expect(patternEditToolbarSource).toContain("editState.tool");
    expect(patternEditToolbarSource).toContain("editState.activeColorCode");
    expect(patternEditToolbarSource).toContain("patternEditActiveColor");
    expect(patternEditToolbarSource).toContain("patternEditReplaceSource");
    expect(patternEditToolbarSource).toContain("patternEditReplaceTarget");
    const activeColorPanelSource = sourceBetween(patternEditToolbarSource, "pattern-edit-active-color-panel", '<div className="inline-flex items-center');
    expect(patternEditToolbarSource).toContain("pattern-active-color-grid");
    expect(patternEditToolbarSource).toContain("aria-pressed={isSelected}");
    expect(activeColorPanelSource).not.toContain('role="radiogroup"');
    expect(activeColorPanelSource).not.toContain('role="radio"');
    expect(activeColorPanelSource).not.toContain("onColorRadioKeyDown");
    expect(patternEditToolbarSource).toContain("onColorRadioKeyDown");
    expect(leftToolbarSource).not.toContain("pattern-edit-toolbar");
    expect(leftToolbarSource).not.toContain("patternEditPaint");
  });

  it("uses delegated pointer editing without per-cell edit callbacks", () => {
    expect(patternGridBoardSource).toContain("data-cell-index={cellIndex}");
    expect(patternGridBoardSource).toContain("data-x={cell.x}");
    expect(patternGridBoardSource).toContain("data-y={cell.y}");
    expect(patternGridSource).toContain("onPointerDown={onBoardPointerDown}");
    expect(patternGridSource).toContain("event.isPrimary");
    expect(patternGridSource).toContain("event.button !== 0");
    expect(patternGridSource).toContain("document.elementFromPoint(event.clientX, event.clientY)");
    expect(patternGridSource).toContain("patternGridCellCanEdit");
    expect(patternGridSource).toContain("patternGridColorFocusEditedAwayMarkerChanges");
    expect(patternGridSource).toContain("patternGridCellCanEdit(pattern.cells[cellIndex]?.color?.code, pinnedColorCode)");
    expect(patternGridSource).toContain("patternGridColorFocusEditedAwayMarkerChanges(");
    expect(patternGridSource).toContain("pinnedColorCode,");
    expect(patternGridSource).not.toContain("getFocusedGridColorCode");
    expect(patternGridSource).toContain("strokeRef.current");
    expect(patternGridSource).toContain("setPointerCapture");
    expect(patternGridSource).toContain("paintPatternCells(currentState, cellIndexes, currentState.activeColorCode, mardPalette)");
    expect(patternGridSource).toContain("erasePatternCells(currentState, cellIndexes)");
    expect(patternGridSource).toContain("viewport.addEventListener(\"wheel\", onWheel, { passive: false })");
  });

  it("supports keyboard-accessible grid editing with one focusable board", () => {
    const gridSource = patternGridSource;
    const boardSource = sourceBetween(patternGridBoardSource, "export function PatternGridBoard", "const PatternRow");
    const rowSource = sourceBetween(patternGridBoardSource, "const PatternRow", "function AxisCell");

    expect(gridSource).toContain("keyboardCellIndexRef");
    expect(gridSource).toContain("const [keyboardCellIndex, setKeyboardCellIndex] = useState(0)");
    expect(gridSource).toContain("const activeGridCellId = `${gridCellIdPrefix}-cell-${keyboardCellIndex}`");
    expect(gridSource).toContain("setKeyboardFocusedCell");
    expect(gridSource).toContain("data-keyboard-active");
    expect(gridSource).toContain("function applyKeyboardCellEdit");
    expect(gridSource).toContain('editState.tool === "view" || editState.tool === "replace"');
    expect(gridSource).toContain("function onBoardKeyDown");
    expect(gridSource).toContain("nextKeyboardCellIndex(currentCellIndex, event.key, pattern.width, pattern.cells.length)");
    expect(patternGridInteractionSource).toContain('key === "ArrowRight"');
    expect(patternGridInteractionSource).toContain('key === "ArrowLeft"');
    expect(patternGridInteractionSource).toContain('key === "ArrowDown"');
    expect(patternGridInteractionSource).toContain('key === "ArrowUp"');
    expect(patternGridInteractionSource).toContain('key === "Home"');
    expect(patternGridInteractionSource).toContain('key === "End"');
    expect(gridSource).toContain('event.key === "Enter" || event.key === " "');
    expect(boardSource).toContain("role=\"grid\"");
    expect(boardSource).toContain("aria-rowcount={pattern.height}");
    expect(boardSource).toContain("aria-colcount={pattern.width}");
    expect(boardSource).toContain("aria-activedescendant={activeCellId}");
    expect(boardSource).toContain("tabIndex={0}");
    expect(boardSource).toContain("aria-describedby={keyboardHintId}");
    expect(rowSource).toContain("role=\"gridcell\"");
    expect(rowSource).toContain("aria-rowindex={cell.y}");
    expect(rowSource).toContain("aria-colindex={cell.x}");
    expect(rowSource).toContain("aria-label={cellLabel}");
    expect(rowSource).toContain("cellNoBeadTitle");
    expect(rowSource).toContain("pattern-cell-code");
    expect(rowSource).not.toContain("h-[22px]");
    expect(rowSource).not.toContain("w-[22px]");
    expect(patternGridBoardSource).toContain("patternGridLabel");
    expect(patternGridBoardSource).toContain("patternGridKeyboardHint");
    expect(patternGridBoardSource).toContain("pattern-guide-x-major");
    expect(patternGridBoardSource).toContain("pattern-guide-y-major");
  });

  it("memoizes grid rows and avoids redundant reprocessing work", () => {
    expect(patternGridBoardSource).toContain("const PatternRow = memo(function PatternRow");
    expect(patternGridBoardSource).toContain("}, arePatternRowPropsEqual);");
    expect(patternGridBoardSource).toContain("buildPatternGridRowModels");
    expect(patternGridBoardSource).toContain("patternGridRowCellsRenderEqual");
    expect(patternGridBoardSource).toContain("patternGridRowMarkersEqual");
    expect(patternGridBoardSource).toContain("startCellIndex={rowModel.startCellIndex}");
    expect(patternGridBoardSource).toContain("cells={rowModel.cells}");
    expect(patternGridBoardSource).not.toContain("<PatternRow key={row}");
    expect(patternGridBoardSource).not.toContain("pattern={pattern}");
    expect(patternGridBoardSource).not.toContain("activeCellIndex={");
    expect(patternGridBoardSource).not.toContain("keyboardCellIndex={");
    expect(patternGridBoardSource).not.toContain("activeCellId={");
    expect(appSource).not.toContain("activeCellIndex={");
  });

  it("interpolates and clears pointer strokes so fast drags do not skip grid cells", () => {
    expect(patternGridSource).toContain('collectStrokeCellIndexes');
    expect(patternGridSource).toContain('from "./pattern-grid-interaction"');
    expect(patternGridInteractionSource).toContain("export function collectStrokeCellIndexes");
    expect(patternGridSource).toContain("const previousCellIndex = stroke.lastCellIndex");
    expect(patternGridSource).toContain("const nextCellIndexes = collectStrokeCellIndexes(previousCellIndex, cellIndex, pattern.width)");
    expect(patternGridSource).toContain("stroke.lastCellIndex = cellIndex");
    expect(patternGridSource).toContain("onPointerLeave={onBoardPointerLeave}");
    expect(patternGridSource).toContain("return () => {");
    expect(patternGridSource).toContain("strokeRef.current = null");
  });

  it("defaults replace source from active color and renders replace swatches", () => {
    expect(patternGridSource).toContain("setReplaceSourceCode(pickedColorCode)");
    expect(patternGridSource).toContain("setReplaceSourceCode(colorCode)");
    expect(patternGridSource).toContain("getPatternReplaceSourceColors(pattern.usage, pinnedColorCode)");
    expect(patternGridSource).toContain("validReplaceSourceCodes.has(selectedReplaceSourceCode)");
    expect(patternGridSource).toContain("const replaceSourceColor = replaceSourceColors.find((color) => color.code === selectedReplaceSourceCode)");
    expect(patternGridSource).toContain("replaceSourceCode={selectedReplaceSourceCode}");
    expect(patternGridSource).toContain("const mardPaletteByCode = new Map");
    expect(patternGridSource).toContain("const replaceTargetColor = mardPaletteByCode.get(replaceTargetCode)");
    expect(patternEditToolbarSource).toContain("selectedColor={replaceSourceColor}");
    expect(patternEditToolbarSource).toContain("selectedColor={replaceTargetColor}");
    expect(patternEditToolbarSource).toContain("pattern-replace-color-dot");
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
      "patternGridLabel",
      "patternGridKeyboardHint",
      "cellNoBeadTitle",
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
    expect(usePatternProcessingSource).toContain("isAcceptedImageFile(file)");
    expect(i18nDataSource).toContain("JPG / PNG / WebP");
    expect(i18nDataSource).not.toContain("JPG/PNG");
  });

  it("rejects image files over the 10MB upload limit before processing", () => {
    expect(maxUploadFileSizeBytes).toBe(10 * 1024 * 1024);
    expect(isWithinUploadFileSizeLimit({ size: maxUploadFileSizeBytes })).toBe(true);
    expect(isWithinUploadFileSizeLimit({ size: maxUploadFileSizeBytes + 1 })).toBe(false);
    expect(usePatternProcessingSource).toContain("maxUploadFileSizeBytes = 10 * 1024 * 1024");
    expect(usePatternProcessingSource).toContain("isWithinUploadFileSizeLimit(file)");
    expect(usePatternProcessingSource).toContain('setErrorKey("fileTooLarge")');
    expect(usePatternProcessingSource.indexOf("isWithinUploadFileSizeLimit(file)")).toBeLessThan(usePatternProcessingSource.indexOf("setIsProcessing(true)"));
    for (const locale of locales) {
      expect(messages[locale.id].fileTooLarge).toContain("10MB");
    }
  });

  it("keeps image processing worker-backed and browser-local with a main-thread fallback", () => {
    expect(patternSource).toContain('from "./image-file-to-pattern.browser"');
    expect(imageFileToPatternSource).toContain('new URL("./image-file-to-pattern.worker.ts", import.meta.url)');
    expect(imageFileToPatternSource).toContain('type: "module"');
    expect(imageFileToPatternSource).toContain('name: "image-file-to-pattern"');
    expect(imageFileToPatternSource).toContain("OffscreenCanvas");
    expect(imageFileToPatternSource).toContain("imageFileToPatternOnMainThread");
    expect(imageFileToPatternSource).toContain("AbortSignal");
    expect(usePatternProcessingSource).toContain("cancelActiveProcessing");
    expect(imageFileToPatternWorkerSource).toContain("workerSelf.onmessage");
    expect(imageFileToPatternWorkerSource).toContain("postWorkerMessage");
    expect(imageFileToPatternWorkerSource).toContain("OffscreenCanvas");
    expect(imageFileToPatternWorkerSource).not.toContain("document.createElement");
  });

  it("moves aspect-ratio output controls into a left workspace toolbar matching the preview rail", () => {
    expect(appSource).toContain("function PatternLongestEdgeToolbar");
    expect(appSource).toContain("grid-size-toolbar");
    expect(appSource).toContain("app-workspace-with-rail");
    expect(appSource).toContain("app-workspace-upload");
    expect(appSource.indexOf("function PatternLongestEdgeToolbar")).toBeGreaterThan(appSource.indexOf("return ("));
    expect(appSource.indexOf("<PatternLongestEdgeToolbar")).toBeLessThan(appSource.indexOf("<UploadWorkspace"));
    expect(appSource).toContain('import { UploadWorkspace } from "./upload-workspace"');
    expect(uploadWorkspaceSource).toContain("export function UploadWorkspace");
  });

  it("renders a longest-edge slider with derived output dimensions", () => {
    expect(patternDimensionsSource).toContain("patternDimensionMin = 40");
    expect(patternDimensionsSource).toContain("patternDimensionMax = 100");
    expect(patternDimensionsSource).toContain("patternLongestEdgePresets");
    expect(patternDimensionsSource).toContain("dimensionsForAspectRatio");
    expect(patternDimensionsSource).toContain("PatternDimensions");
    expect(patternSource).toContain("pattern-dimensions");
    expect(patternSource).not.toContain("type GridSize");
    expect(patternSource).not.toContain("size: GridSize");
    expect(appSource).not.toContain("GridSize");
    expect(appSource).not.toContain("gridSizes");
    expect(appSource).not.toContain("pattern.size");

    expect(appSource).toContain("longestEdge");
    expect(appSource).toContain("sourceImageSize");
    expect(usePatternProcessingSource).toContain("setSourceImageSize");
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
    expect(usePatternProcessingSource).toContain("refreshPreview: false");
    expect(i18nDataSource).toContain("patternLongestEdge");
    expect(i18nDataSource).toContain("{width}x{height}");
  });

  it("renders the three longest-edge presets in one horizontal row", () => {
    expect(appSource).toContain("mt-3 grid grid-cols-3 gap-2");
    expect(appSource).not.toContain("mt-3 grid gap-2");
  });

  it("renders color mapping controls in the left parameter toolbar", () => {
    expect(colorMatchingSource).toContain('colorDistanceModes = ["oklab", "rgb-fast", "weighted-rgb", "lab-delta-e"]');
    expect(ditherSource).toContain('ditherModes = ["off", "floyd-steinberg", "ordered"]');
    expect(maxColorSource).toContain("maxColorCountMin = 2");
    expect(maxColorSource).toContain("maxColorCountMax = 64");
    expect(maxColorSource).toContain("defaultMaxColorCount: MaxColorCount = 24");
    expect(colorMatchingSource).toContain('defaultColorDistanceMode: ColorDistanceMode = "oklab"');
    expect(patternSource).toContain("color-matching");
    expect(patternSource).toContain('from "./dither"');
    expect(patternSource).toContain('from "./max-color"');
    expect(ditherSource).toContain('defaultDitherMode: DitherMode = "off"');
    expect(appSource).toContain("function PatternAdjustmentControls");
    expect(appSource).toContain("colorDistanceModes.map");
    expect(appSource).toContain("ditherModes.map");
    expect(appSource).toContain('selectedLabelClassName="pointer-events-none min-w-0 flex-1 truncate text-center"');
    expect(appSource).not.toContain("colorMatchingModes.map");
    expect(appSource).not.toContain("maxColorCountOptions.map");
    expect(appSource).toContain("min={maxColorCountMin}");
    expect(appSource).toContain("max={maxColorCountMax}");
    expect(appSource).toContain("decreaseMaxColorCount");
    expect(appSource).toContain("increaseMaxColorCount");
    expect(appSource).toContain("onPatternAdjustmentChange");
    expect(usePatternProcessingSource).toContain("schedulePatternReprocess(longestEdge, normalizedOptions)");
    expect(usePatternProcessingSource).toContain("processingOptions: nextProcessingOptions");
    expect(i18nDataSource).toContain("colorDistanceModeOklab");
    expect(i18nDataSource).toContain("colorDistanceModeLabDeltaE");
    expect(i18nDataSource).toContain("ditherModeFloydSteinberg");
    expect(i18nDataSource).toContain("ditherModeOrdered");
    expect(i18nDataSource).toContain("maxColorCountValue");
  });

  it("persists generation controls and restores the last local workspace", () => {
    expect(patternPreferencesSource).toContain('patternPreferencesStorageKey = "fundbeads.patternPreferences"');
    expect(patternPreferencesSource).toContain("readStoredPatternPreferences");
    expect(patternPreferencesSource).toContain("writeStoredPatternPreferences");
    expect(lastWorkspaceDbSource).toContain('lastWorkspaceRecordId = "last-workspace"');
    expect(lastWorkspaceDbSource).toContain("saveLastWorkspaceRecord");
    expect(lastWorkspaceDbSource).toContain("readLastWorkspaceRecord");
    expect(lastWorkspaceDbSource).toContain("clearLastWorkspaceRecord");
    expect(usePatternProcessingSource).toContain("readStoredPatternPreferences");
    expect(usePatternProcessingSource).toContain("writeStoredPatternPreferences");
    expect(usePatternProcessingSource).toContain("restorePatternWorkspace");
    expect(usePatternProcessingSource).toContain("sourceFile");
    expect(appSource).toContain("readLastWorkspaceRecord");
    expect(appSource).toContain("saveLastWorkspaceRecord");
    expect(appSource).toContain("clearLastWorkspaceRecord");
    expect(appSource).toContain("restorePatternWorkspace");
    expect(usePatternProcessingSource).toContain("processedWorkspace");
    expect(usePatternProcessingSource).toContain("setProcessedWorkspace");
    expect(lastWorkspaceDbSource).toContain("basePatternRecord");
    expect(lastWorkspaceDbSource).toContain("overrides");
    expect(lastWorkspaceDbSource).toContain("isAcceptedImageFile");
    expect(lastWorkspaceDbSource).toContain("isWithinUploadFileSizeLimit");
    expect(appSource).toContain("createPatternEditState(restoredWorkspace.basePattern, mardPalette, { overrides: restoredWorkspace.overrides })");
    expect(appSource).toContain("sourceImage: processedWorkspace.sourceFile");
    expect(appSource).toContain("basePattern: processedWorkspace.pattern");
    expect(appSource).toContain("overrides: patternEditState.overrides");
    expect(appSource).not.toContain("createPatternEditState(restoredWorkspace.pattern, mardPalette)");
    expect(appSource).not.toContain("pattern: effectivePattern");
    expect(appSource).not.toContain("localStorage.setItem(\"sourceImage");
    expect(appSource).not.toContain("previewObjectUrl");
  });



  it("opens MARD palette details from the top action instead of the empty homepage", () => {
    expect(appSource).toContain("isPaletteOpen");
    expect(appSource).toContain("setIsPaletteOpen(true)");
    expect(paletteDialogSource).toContain("function PaletteDialog");
    expect(paletteDialogSource).toContain('aria-modal="true"');
    expect(paletteDialogSource).toContain("dialogRef");
    expect(paletteDialogSource).toContain("closeButtonRef");
    expect(paletteDialogSource).toContain('event.key !== "Tab"');
    expect(paletteDialogSource).toContain("previouslyFocusedElement?.focus()");
    expect(appSource).toContain("isPaletteOpen ? <PaletteDialog");
    expect(appSource).not.toContain("pattern ? <ColorSummary pattern={pattern}");
    expect(appSource).not.toContain("pattern ? <ColorSummary pattern={pattern} /> : <MardPaletteShowcase />");
    expect(i18nDataSource).toContain("closeDialog");
  });

  it("keeps dropped files available for resolution changes", () => {
    expect(usePatternProcessingSource).toContain("activeFileRef");
    expect(usePatternProcessingSource).toContain("activeFileRef.current");
  });

  it("guards async pattern updates against outdated upload results", () => {
    expect(usePatternProcessingSource).toContain("processRunIdRef");
    expect(usePatternProcessingSource).toContain("processRunIdRef.current");
  });

  it("invalidates pending pattern work before rejecting unsupported files", () => {
    expect(usePatternProcessingSource).toContain("const processRunId = processRunIdRef.current + 1");
    expect(usePatternProcessingSource.indexOf("const processRunId = processRunIdRef.current + 1")).toBeLessThan(usePatternProcessingSource.indexOf('setErrorKey("unsupportedImage")'));
    expect(usePatternProcessingSource.indexOf("const processRunId = processRunIdRef.current + 1")).toBeLessThan(usePatternProcessingSource.indexOf('setErrorKey("fileTooLarge")'));
  });

  it("keeps image processing silent in the visible UI to avoid layout jumps", () => {
    expect(usePatternProcessingSource).toContain("const [isProcessing, setIsProcessing] = useState(false)");
    expect(uploadWorkspaceSource).toContain("aria-busy={isProcessing}");
    expect(appSource).not.toContain("role=\"status\"");
    expect(appSource).not.toContain("aria-live=\"polite\"");
    expect(appSource).not.toContain("processingImage");
    expect(uploadWorkspaceSource).not.toContain("processingImage");
    expect(uploadWorkspaceSource).toContain("onDragEnter={onDragEnter}");
    expect(usePatternProcessingSource).toContain("dragDepthRef.current += 1");
    expect(usePatternProcessingSource).toContain("dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)");
    expect(usePatternProcessingSource).toContain("dragDepthRef.current = 0");
    expect(i18nDataSource).not.toContain("processingImage");
  });

  it("does not recreate the original preview when only resolution changes", () => {
    expect(usePatternProcessingSource).toContain("refreshPreview");
    expect(usePatternProcessingSource).toContain("refreshPreview: false");
  });

  it("exposes the dropzone with button semantics", () => {
    expect(uploadWorkspaceSource).toContain('role="button"');
    expect(uploadWorkspaceSource).toContain("aria-describedby");
  });

  it("renders the empty upload state as an image preview placeholder", () => {
    expect(uploadWorkspaceSource).toContain("upload-preview-placeholder");
    expect(uploadWorkspaceSource).toContain("upload-preview-canvas");
    expect(uploadWorkspaceSource).toContain("upload-preview-frame");
  });

  it("keeps the original preview, compact stats, and scrollable details in the right rail", () => {
    expect(patternSideRailSource).toContain("export function PatternSideRail");
    expect(patternSideRailSource).toContain("function PatternStatsCard");
    expect(patternSideRailSource).toContain("xl:self-stretch");
    expect(patternSideRailSource).toContain("pattern-side-rail");
    expect(patternSideRailSource).toContain("overflow-hidden");
    expect(patternSideRailSource).toContain("xl:h-full");
    expect(patternSideRailSource).toContain("xl:min-h-0");
    expect(patternSideRailSource).toContain("<PatternStatsCard pattern={pattern} />");
    expect(patternSideRailSource).toContain('<ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern} pinnedColorCode={pinnedColorCode} onPreviewColorChange={onPreviewColorChange} onPinnedColorToggle={onPinnedColorToggle} compact />');
    expect(patternSideRailSource.indexOf("<ImagePreview")).toBeLessThan(patternSideRailSource.indexOf("<PatternStatsCard"));
    expect(patternSideRailSource.indexOf("<PatternStatsCard")).toBeLessThan(patternSideRailSource.indexOf("<ColorUsageDetail"));
    expect(patternSideRailSource).not.toContain("mt-3 grid min-h-56 place-items-center bg-background");
  });
});
