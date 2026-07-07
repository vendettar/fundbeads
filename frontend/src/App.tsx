import {
  ImageUp,
  Languages,
  Minus,
  Paintbrush,
  Palette,
  PanelsTopLeft,
  Pipette,
  Plus,
  Replace,
  TableCellsSplit,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { locales, normalizeLocale, useI18n } from "./i18n";
import { interfaceStyles, normalizeInterfaceStyle, useInterfaceStyle, type InterfaceStyleId } from "./interface-style";
import { clearLastWorkspaceRecord, readLastWorkspaceRecord, saveLastWorkspaceRecord } from "./last-workspace-db";
import { mardPalette } from "./palette";
import { PaletteDialog } from "./palette-dialog";
import { PatternGrid } from "./pattern-grid";
import { axisLabels } from "./pattern-grid-geometry";
import { buildPatternGridColorCellIndex, patternGridColorFocusClassChanges } from "./pattern-grid-interaction";
import { PatternSideRail } from "./pattern-side-rail";
import { PreferenceSelect } from "./preference-select";
import {
  createPatternEditState,
  getEffectivePattern,
  type PatternEditState,
} from "./pattern-edit";
import {
  colorDistanceModes,
  dimensionsForAspectRatio,
  ditherModes,
  maxColorCountMax,
  maxColorCountMin,
  normalizeColorDistanceMode,
  normalizeDitherMode,
  patternDimensionMax,
  patternDimensionMin,
  patternLongestEdgePresets,
  smoothingLevelMax,
  smoothingLevelMin,
  type ColorDistanceMode,
  type DitherMode,
  type MaxColorCount,
  type Pattern,
} from "./pattern";
import { normalizeTheme, themes, useTheme, type ThemeId } from "./themes";
import { UploadWorkspace } from "./upload-workspace";
import { usePatternProcessing, type LongestEdgeChangeOptions, type PatternAdjustmentOptions } from "./use-pattern-processing";

const themeShortLabels: Record<ThemeId, string> = {
  classic: "CL",
  midnight: "MN",
  ocean: "OC",
  candy: "CY",
  mono: "MO",
};

const interfaceStyleShortLabels: Record<InterfaceStyleId, string> = {
  modern: "MD",
  pixel: "PX",
  "glass-desk": "GD",
  "arcade-cabinet": "AC",
};

const colorDistanceModeShortLabels: Record<ColorDistanceMode, string> = {
  oklab: "OK lab",
  "rgb-fast": "RGB",
  "weighted-rgb": "Weighted RGB",
  "lab-delta-e": "Lab DE76",
};

const ditherModeShortLabels: Record<DitherMode, string> = {
  off: "Off",
  "floyd-steinberg": "Dithered",
  ordered: "Ordered",
};

function FundbeadsLogo() {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 36 36" role="img" aria-hidden="true" focusable="false">
      <circle className="fill-primary" cx="4.8" cy="4.8" r="3.35" />
      <circle className="fill-primary" cx="4.8" cy="11.4" r="3.35" />
      <circle className="fill-primary" cx="4.8" cy="18" r="3.35" />
      <circle className="fill-primary" cx="4.8" cy="24.6" r="3.35" />
      <circle className="fill-primary" cx="4.8" cy="31.2" r="3.35" />
      <circle className="fill-secondary" cx="9.2" cy="11.4" r="3.35" />
      <circle className="fill-secondary" cx="13.6" cy="18" r="3.35" />
      <circle className="fill-accent" cx="18" cy="24.6" r="3.35" />
      <circle className="fill-secondary" cx="22.4" cy="18" r="3.35" />
      <circle className="fill-secondary" cx="26.8" cy="11.4" r="3.35" />
      <circle className="fill-primary" cx="31.2" cy="4.8" r="3.35" />
      <circle className="fill-primary" cx="31.2" cy="11.4" r="3.35" />
      <circle className="fill-primary" cx="31.2" cy="18" r="3.35" />
      <circle className="fill-primary" cx="31.2" cy="24.6" r="3.35" />
      <circle className="fill-primary" cx="31.2" cy="31.2" r="3.35" />
      <circle className="fill-card/75" cx="4.8" cy="4.8" r="1.05" />
      <circle className="fill-card/75" cx="4.8" cy="11.4" r="1.05" />
      <circle className="fill-card/75" cx="4.8" cy="18" r="1.05" />
      <circle className="fill-card/75" cx="4.8" cy="24.6" r="1.05" />
      <circle className="fill-card/75" cx="4.8" cy="31.2" r="1.05" />
      <circle className="fill-card/75" cx="9.2" cy="11.4" r="1.05" />
      <circle className="fill-card/75" cx="13.6" cy="18" r="1.05" />
      <circle className="fill-card/75" cx="18" cy="24.6" r="1.05" />
      <circle className="fill-card/75" cx="22.4" cy="18" r="1.05" />
      <circle className="fill-card/75" cx="26.8" cy="11.4" r="1.05" />
      <circle className="fill-card/75" cx="31.2" cy="4.8" r="1.05" />
      <circle className="fill-card/75" cx="31.2" cy="11.4" r="1.05" />
      <circle className="fill-card/75" cx="31.2" cy="18" r="1.05" />
      <circle className="fill-card/75" cx="31.2" cy="24.6" r="1.05" />
      <circle className="fill-card/75" cx="31.2" cy="31.2" r="1.05" />
    </svg>
  );
}

export function App() {
  const [patternEditState, setPatternEditState] = useState<PatternEditState | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [pinnedColorCode, setPinnedColorCode] = useState<string | null>(null);
  const patternGridRef = useRef<HTMLDivElement>(null);
  const pinnedColorCodeRef = useRef<string | null>(null);
  const patternGridColorCellIndexRef = useRef<Map<string, HTMLElement[]>>(new Map());
  const focusedColorCodeRef = useRef<string | null>(null);
  const pendingFocusedColorCodeRef = useRef<string | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const { locale, setLocale, t, themeLabel, interfaceStyleLabel } = useI18n();
  const { theme, setTheme } = useTheme();
  const { interfaceStyle, setInterfaceStyle } = useInterfaceStyle();

  const clearPinnedColorSelection = useCallback(() => {
    pinnedColorCodeRef.current = null;
    setPinnedColorCode(null);
    pendingFocusedColorCodeRef.current = null;
    focusedColorCodeRef.current = null;

    const grid = patternGridRef.current;
    if (!grid) {
      return;
    }

    for (const cell of grid.querySelectorAll<HTMLElement>(".pattern-cell.is-focused-color")) {
      cell.classList.remove("is-focused-color");
    }
    delete grid.dataset.colorFocus;
    delete grid.dataset.colorFocusCode;
  }, []);

  const handlePatternProcessed = useCallback((nextPattern: Pattern) => {
    clearPinnedColorSelection();
    setPatternEditState(createPatternEditState(nextPattern, mardPalette));
  }, [clearPinnedColorSelection]);
  const handlePatternCleared = useCallback(() => {
    clearPinnedColorSelection();
    setPatternEditState(null);
    void clearLastWorkspaceRecord();
  }, [clearPinnedColorSelection]);
  const {
    longestEdge,
    fileName,
    errorKey,
    isProcessing,
    isDraggingFile,
    previewUrl,
    sourceImageSize,
    colorDistanceMode,
    ditherMode,
    smoothingLevel,
    maxColorCount,
    processedWorkspace,
    onFileChange,
    onFileDrop,
    onFileDragEnter,
    onFileDragOver,
    onFileDragLeave,
    onLongestEdgeChange,
    onPatternAdjustmentChange,
    restorePatternWorkspace,
  } = usePatternProcessing({
    onPatternProcessed: handlePatternProcessed,
    onPatternCleared: handlePatternCleared,
  });

  const effectivePattern = useMemo(() => (patternEditState ? getEffectivePattern(patternEditState, mardPalette) : null), [patternEditState]);
  const fallbackDimensions = useMemo(() => ({ width: longestEdge, height: longestEdge }), [longestEdge]);
  const outputDimensions = useMemo(
    () => (sourceImageSize ? dimensionsForAspectRatio(sourceImageSize, longestEdge) : effectivePattern ?? fallbackDimensions),
    [effectivePattern, fallbackDimensions, longestEdge, sourceImageSize],
  );
  const xLabels = useMemo(() => axisLabels(outputDimensions.width), [outputDimensions.width]);
  const localeOptions = useMemo(() => locales.map((nextLocale) => ({ value: nextLocale.id, label: nextLocale.label, displayLabel: nextLocale.shortLabel })), []);
  const themeOptions = useMemo(
    () => themes.map((nextTheme) => ({ value: nextTheme.id, label: themeLabel(nextTheme.id), displayLabel: themeShortLabels[nextTheme.id] })),
    [themeLabel],
  );
  const interfaceStyleOptions = useMemo(
    () =>
      interfaceStyles.map((nextStyle) => ({
        value: nextStyle.id,
        label: interfaceStyleLabel(nextStyle.id),
        displayLabel: interfaceStyleShortLabels[nextStyle.id],
      })),
    [interfaceStyleLabel],
  );

  useEffect(() => {
    let isCancelled = false;

    async function restoreLastWorkspace() {
      const restoredWorkspace = await readLastWorkspaceRecord();
      if (isCancelled || !restoredWorkspace) {
        return;
      }

      const restoredSourceFile = new File([restoredWorkspace.sourceImage], restoredWorkspace.sourceFileName, {
        type: restoredWorkspace.sourceMimeType || restoredWorkspace.sourceImage.type,
        lastModified: restoredWorkspace.updatedAt,
      });
      restorePatternWorkspace({
        sourceFile: restoredSourceFile,
        sourceImageSize: restoredWorkspace.sourceImageSize,
        preferences: restoredWorkspace.preferences,
        pattern: restoredWorkspace.basePattern,
      });
      clearPinnedColorSelection();
      setPatternEditState(createPatternEditState(restoredWorkspace.basePattern, mardPalette, { overrides: restoredWorkspace.overrides }));
    }

    void restoreLastWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [clearPinnedColorSelection, restorePatternWorkspace]);

  useEffect(() => {
    if (!processedWorkspace || !patternEditState) {
      return;
    }

    void saveLastWorkspaceRecord({
      sourceImage: processedWorkspace.sourceFile,
      sourceFileName: processedWorkspace.sourceFile.name,
      sourceMimeType: processedWorkspace.sourceFile.type,
      sourceImageSize: processedWorkspace.sourceImageSize,
      basePattern: processedWorkspace.pattern,
      overrides: patternEditState.overrides,
      preferences: processedWorkspace.preferences,
    });
  }, [patternEditState, processedWorkspace]);

  const applyGridFocusedColorCode = useCallback((colorCode: string | null, options: { force?: boolean } = {}) => {
    const grid = patternGridRef.current;
    if (!grid) {
      return;
    }

    const nextColorCode = colorCode ?? null;
    const focusChanges = patternGridColorFocusClassChanges(focusedColorCodeRef.current, nextColorCode, patternGridColorCellIndexRef.current, options);

    for (const cell of focusChanges.removeItems) {
      cell.classList.remove("is-focused-color");
    }

    for (const cell of focusChanges.addItems) {
      cell.classList.add("is-focused-color");
    }

    if (nextColorCode) {
      grid.dataset.colorFocus = "active";
      grid.dataset.colorFocusCode = nextColorCode;
    } else {
      delete grid.dataset.colorFocus;
      delete grid.dataset.colorFocusCode;
    }

    focusedColorCodeRef.current = nextColorCode;
  }, []);

  const syncPatternGridColorFocus = useCallback(() => {
    const nextFocusedColorCode = pinnedColorCodeRef.current ?? focusedColorCodeRef.current;
    pendingFocusedColorCodeRef.current = null;
    if (focusFrameRef.current !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(focusFrameRef.current);
      }
      focusFrameRef.current = null;
    }

    const grid = patternGridRef.current;
    if (!grid) {
      patternGridColorCellIndexRef.current = new Map();
      focusedColorCodeRef.current = null;
      return;
    }

    for (const cell of grid.querySelectorAll<HTMLElement>(".pattern-cell.is-focused-color")) {
      cell.classList.remove("is-focused-color");
    }

    delete grid.dataset.colorFocus;
    delete grid.dataset.colorFocusCode;
    focusedColorCodeRef.current = null;
    patternGridColorCellIndexRef.current = buildPatternGridColorCellIndex(
      [...grid.querySelectorAll<HTMLElement>(".pattern-cell[data-color-code]")].map((cell) => ({
        colorCode: cell.dataset.colorCode,
        item: cell,
      })),
    );
    applyGridFocusedColorCode(nextFocusedColorCode, { force: true });
  }, [applyGridFocusedColorCode]);

  const setGridFocusedColorCode = useCallback((colorCode: string | null) => {
    pendingFocusedColorCodeRef.current = colorCode;

    if (focusFrameRef.current !== null) {
      return;
    }

    if (typeof requestAnimationFrame === "undefined") {
      applyGridFocusedColorCode(pendingFocusedColorCodeRef.current);
      pendingFocusedColorCodeRef.current = null;
      return;
    }

    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      applyGridFocusedColorCode(pendingFocusedColorCodeRef.current);
      pendingFocusedColorCodeRef.current = null;
    });
  }, [applyGridFocusedColorCode]);

  const handlePreviewColorChange = useCallback(
    (colorCode: string | null) => {
      if (pinnedColorCodeRef.current !== null) {
        return;
      }

      setGridFocusedColorCode(colorCode);
    },
    [setGridFocusedColorCode],
  );

  const handlePinnedColorToggle = useCallback(
    (colorCode: string) => {
      const nextPinnedColorCode = pinnedColorCodeRef.current === colorCode ? null : colorCode;
      pinnedColorCodeRef.current = nextPinnedColorCode;
      setPinnedColorCode(nextPinnedColorCode);
      setGridFocusedColorCode(nextPinnedColorCode);
    },
    [setGridFocusedColorCode],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.uiStyle = interfaceStyle;
  }, [interfaceStyle]);

  useEffect(() => {
    syncPatternGridColorFocus();
  }, [effectivePattern, syncPatternGridColorFocus]);

  useEffect(() => {
    return () => {
      if (focusFrameRef.current !== null) {
        if (typeof cancelAnimationFrame !== "undefined") {
          cancelAnimationFrame(focusFrameRef.current);
        }
        focusFrameRef.current = null;
      }
    };
  }, []);

  function onUploadKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      document.getElementById("image-upload")?.click();
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <input id="image-upload" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
      <section className="border-b border-border bg-card shadow-panel">
        <div className="flex flex-col gap-4 px-3 py-4 sm:px-4 lg:px-6">
          <div className="app-header-layout grid gap-4 xl:items-center">
            <div className="min-w-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FundbeadsLogo />
                  <p className="text-xs font-bold uppercase text-primary">{t("appName")}</p>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-border sm:pl-6">
                <button
                  type="button"
                  onClick={() => setIsPaletteOpen(true)}
                  className="text-caption-compact inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 font-bold text-foreground shadow-panel transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Palette size={13} />
                  <span>{t("mardPaletteTitle")}</span>
                </button>
              </div>
            </div>

            <div className="min-w-0 xl:ml-auto xl:shrink-0">
              <div className="flex max-w-full flex-wrap items-center gap-2 p-1 xl:justify-end">
                <label htmlFor="image-upload" className="inline-flex h-10 max-w-48 shrink-0 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-panel transition hover:opacity-95">
                  <ImageUp size={18} />
                  <span className="truncate">{t("uploadImage")}</span>
                </label>

                <span className="h-7 w-px shrink-0 bg-border" />

                <div className="flex shrink-0 items-center gap-2">
                  <PreferenceSelect
                    label={t("language")}
                    icon={<Languages size={15} />}
                    value={locale}
                    onChange={(value) => {
                      const nextLocale = normalizeLocale(value);
                      if (nextLocale) {
                        setLocale(nextLocale);
                      }
                    }}
                    options={localeOptions}
                  />
                  <PreferenceSelect
                    label={t("theme")}
                    icon={<Paintbrush size={15} />}
                    value={theme}
                    onChange={(value) => {
                      const nextTheme = normalizeTheme(value);
                      if (nextTheme) {
                        setTheme(nextTheme);
                      }
                    }}
                    options={themeOptions}
                  />
                  <PreferenceSelect
                    label={t("interfaceStyle")}
                    icon={<PanelsTopLeft size={15} />}
                    value={interfaceStyle}
                    onChange={(value) => {
                      const nextStyle = normalizeInterfaceStyle(value);
                      if (nextStyle) {
                        setInterfaceStyle(nextStyle);
                      }
                    }}
                    options={interfaceStyleOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          {errorKey ? (
            <p role="alert" className="rounded-md border border-destructive bg-background px-3 py-2 text-sm font-semibold text-destructive">
              {t(errorKey)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="px-3 py-4 sm:px-4 lg:px-6" aria-busy={isProcessing}>
        {effectivePattern && patternEditState ? (
          <div className="app-workspace-with-rail grid gap-4 xl:items-stretch">
            <PatternLongestEdgeToolbar
              className="h-full self-stretch"
              longestEdge={longestEdge}
              colorDistanceMode={colorDistanceMode}
              ditherMode={ditherMode}
              smoothingLevel={smoothingLevel}
              maxColorCount={maxColorCount}
              onLongestEdgeChange={onLongestEdgeChange}
              onPatternAdjustmentChange={onPatternAdjustmentChange}
            />
            <PatternGrid
              pattern={effectivePattern}
              editState={patternEditState}
              onEditStateChange={(updater) => setPatternEditState((currentState) => (currentState ? updater(currentState) : currentState))}
              xLabels={xLabels}
              gridRef={patternGridRef}
              pinnedColorCode={pinnedColorCode}
              onGridDisplayOptionsChange={syncPatternGridColorFocus}
            />
            {previewUrl ? (
              <PatternSideRail
                fileName={fileName}
                pattern={effectivePattern}
                previewUrl={previewUrl}
                pinnedColorCode={pinnedColorCode}
                onPreviewColorChange={handlePreviewColorChange}
                onPinnedColorToggle={handlePinnedColorToggle}
              />
            ) : null}
          </div>
        ) : (
          <div className="app-workspace-upload grid items-stretch gap-4">
            <PatternLongestEdgeToolbar
              className="h-full self-stretch"
              longestEdge={longestEdge}
              colorDistanceMode={colorDistanceMode}
              ditherMode={ditherMode}
              smoothingLevel={smoothingLevel}
              maxColorCount={maxColorCount}
              onLongestEdgeChange={onLongestEdgeChange}
              onPatternAdjustmentChange={onPatternAdjustmentChange}
            />
            <UploadWorkspace
              isDraggingFile={isDraggingFile}
              isProcessing={isProcessing}
              onDrop={onFileDrop}
              onDragEnter={onFileDragEnter}
              onDragOver={onFileDragOver}
              onDragLeave={onFileDragLeave}
              onKeyDown={onUploadKeyDown}
            />
          </div>
        )}
      </section>
      {isPaletteOpen ? <PaletteDialog onClose={() => setIsPaletteOpen(false)} /> : null}
    </main>
  );
}

function PatternLongestEdgeToolbar({
  className = "",
  longestEdge,
  colorDistanceMode,
  ditherMode,
  smoothingLevel,
  maxColorCount,
  onLongestEdgeChange,
  onPatternAdjustmentChange,
}: {
  className?: string;
  longestEdge: number;
  colorDistanceMode: ColorDistanceMode;
  ditherMode: DitherMode;
  smoothingLevel: number;
  maxColorCount: MaxColorCount;
  onLongestEdgeChange: (longestEdge: number, options?: LongestEdgeChangeOptions) => Promise<void>;
  onPatternAdjustmentChange: (options: Partial<PatternAdjustmentOptions>) => void;
}) {
  const { locale, t } = useI18n();

  return (
    <aside className={`grid-size-toolbar border border-border bg-card p-3 shadow-panel ${className}`} aria-label={t("gridSize")}>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <TableCellsSplit size={16} />
        <h2 className="text-sm font-semibold">{t("gridSize")}</h2>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {patternLongestEdgePresets.map((preset, presetIndex) => {
          const labelKey =
            presetIndex === 0
              ? "presetSmall"
              : presetIndex === 1
                ? "presetMedium"
                : "presetLarge";
          const isLongLocale = locale === "en" || locale === "es";

          return (
            <button
              key={preset}
              type="button"
              onClick={() => void onLongestEdgeChange(preset, { reprocess: "immediate" })}
              className={`grid h-10 min-w-0 place-items-center rounded-md border px-0.5 text-center font-mono font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
                longestEdge === preset
                  ? "border-secondary bg-secondary text-secondary-foreground shadow-panel"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className={`text-xs tracking-tight ${isLongLocale ? "preset-label-condensed" : ""}`}>
                {t(labelKey)} {preset}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 border-t border-border pt-3">
        <PatternLongestEdgeControl
          label={t("patternLongestEdge")}
          decreaseLabel={t("decreasePatternLongestEdge")}
          increaseLabel={t("increasePatternLongestEdge")}
          value={longestEdge}
          onChange={(nextLongestEdge) => void onLongestEdgeChange(nextLongestEdge)}
        />
      </div>
      <PatternAdjustmentControls
        colorDistanceMode={colorDistanceMode}
        ditherMode={ditherMode}
        smoothingLevel={smoothingLevel}
        maxColorCount={maxColorCount}
        onChange={onPatternAdjustmentChange}
      />
    </aside>
  );
}

function PatternLongestEdgeControl({
  label,
  decreaseLabel,
  increaseLabel,
  value,
  onChange,
}: {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const decreaseDisabled = value <= patternDimensionMin;
  const increaseDisabled = value >= patternDimensionMax;

  return (
    <div className="grid gap-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-border bg-background">
          <button
            type="button"
            aria-label={decreaseLabel}
            title={decreaseLabel}
            disabled={decreaseDisabled}
            onClick={() => onChange(value - 1)}
            className="grid size-8 place-items-center text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
          <span className="grid h-8 min-w-10 place-items-center border-x border-border px-2 font-mono text-xs font-bold text-foreground">{value}</span>
          <button
            type="button"
            aria-label={increaseLabel}
            title={increaseLabel}
            disabled={increaseDisabled}
            onClick={() => onChange(value + 1)}
            className="grid size-8 place-items-center text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </span>
      </div>
      <input
        type="range"
        min={patternDimensionMin}
        max={patternDimensionMax}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="pattern-dimension-slider w-full accent-primary focus:outline-none"
      />
    </div>
  );
}

function PatternAdjustmentControls({
  colorDistanceMode,
  ditherMode,
  smoothingLevel,
  maxColorCount,
  onChange,
}: {
  colorDistanceMode: ColorDistanceMode;
  ditherMode: DitherMode;
  smoothingLevel: number;
  maxColorCount: MaxColorCount;
  onChange: (options: Partial<PatternAdjustmentOptions>) => void;
}) {
  const { formatNumber, t } = useI18n();
  const colorDistanceDescriptionId = useId();
  const ditherDescriptionId = useId();
  const smoothingDecreaseDisabled = smoothingLevel <= smoothingLevelMin;
  const smoothingIncreaseDisabled = smoothingLevel >= smoothingLevelMax;
  const maxColorDecreaseDisabled = maxColorCount <= maxColorCountMin;
  const maxColorIncreaseDisabled = maxColorCount >= maxColorCountMax;
  const colorDistanceDescription = getColorDistanceModeDescription(colorDistanceMode, t);
  const ditherDescription = getDitherModeDescription(ditherMode, t);

  return (
    <section className="mt-4 grid gap-4 border-t border-border pt-3" aria-label={t("colorMapping")}>
      <div className="grid gap-2">
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">{t("colorDistanceMode")}</span>
          <span className="text-caption-compact leading-snug text-muted-foreground">{t("colorDistanceModeHint")}</span>
        </div>
        <PreferenceSelect
          label={t("colorDistanceMode")}
          icon={<Pipette size={15} />}
          value={colorDistanceMode}
          onChange={(value) => onChange({ colorDistanceMode: normalizeColorDistanceMode(value) })}
          describedBy={colorDistanceDescriptionId}
          className="w-full justify-between text-xs"
          selectedLabelClassName="pointer-events-none min-w-0 flex-1 truncate text-center"
          options={colorDistanceModes.map((mode) => ({
            value: mode,
            label: getColorDistanceModeLabel(mode, t),
            selectedLabel: getColorDistanceModeLabel(mode, t),
            displayLabel: colorDistanceModeShortLabels[mode],
            description: getColorDistanceModeDescription(mode, t),
          }))}
        />
        <p id={colorDistanceDescriptionId} className="text-caption-dense min-w-0 break-words font-semibold leading-snug text-muted-foreground">{colorDistanceDescription}</p>
      </div>

      <div className="grid gap-2">
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">{t("ditherMode")}</span>
          <span className="text-caption-compact leading-snug text-muted-foreground">{t("ditherModeHint")}</span>
        </div>
        <PreferenceSelect
          label={t("ditherMode")}
          icon={<Replace size={15} />}
          value={ditherMode}
          onChange={(value) => onChange({ ditherMode: normalizeDitherMode(value) })}
          describedBy={ditherDescriptionId}
          className="w-full justify-between text-xs"
          selectedLabelClassName="pointer-events-none min-w-0 flex-1 truncate text-center"
          options={ditherModes.map((mode) => ({
            value: mode,
            label: getDitherModeLabel(mode, t),
            selectedLabel: getDitherModeLabel(mode, t),
            displayLabel: ditherModeShortLabels[mode],
            description: getDitherModeDescription(mode, t),
          }))}
        />
        <p id={ditherDescriptionId} className="text-caption-dense min-w-0 break-words font-semibold leading-snug text-muted-foreground">{ditherDescription}</p>
      </div>

      <div className="grid gap-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-muted-foreground">{t("smoothingLevel")}</span>
          <span className="inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-border bg-background">
            <button
              type="button"
              aria-label={t("decreaseSmoothing")}
              title={t("decreaseSmoothing")}
              disabled={smoothingDecreaseDisabled}
              onClick={() => onChange({ smoothingLevel: smoothingLevel - 1 })}
              className="grid size-8 place-items-center text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus size={14} />
            </button>
            <span className="grid h-8 min-w-10 place-items-center border-x border-border px-2 font-mono text-xs font-bold text-foreground">{smoothingLevel}</span>
            <button
              type="button"
              aria-label={t("increaseSmoothing")}
              title={t("increaseSmoothing")}
              disabled={smoothingIncreaseDisabled}
              onClick={() => onChange({ smoothingLevel: smoothingLevel + 1 })}
              className="grid size-8 place-items-center text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </span>
        </div>
        <input
          type="range"
          min={smoothingLevelMin}
          max={smoothingLevelMax}
          step={1}
          value={smoothingLevel}
          onChange={(event) => onChange({ smoothingLevel: Number(event.target.value) })}
          aria-label={t("smoothingLevel")}
          className="pattern-dimension-slider w-full accent-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-muted-foreground">{t("maxColorCount")}</span>
          <span className="inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-border bg-background">
            <button
              type="button"
              aria-label={t("decreaseMaxColorCount")}
              title={t("decreaseMaxColorCount")}
              disabled={maxColorDecreaseDisabled}
              onClick={() => onChange({ maxColorCount: maxColorCount - 1 })}
              className="grid size-8 place-items-center text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus size={14} />
            </button>
            <span className="grid h-8 min-w-10 place-items-center border-x border-border px-2 font-mono text-xs font-bold text-foreground" title={t("maxColorCountValue", { count: maxColorCount })}>
              {formatNumber(maxColorCount)}
            </span>
            <button
              type="button"
              aria-label={t("increaseMaxColorCount")}
              title={t("increaseMaxColorCount")}
              disabled={maxColorIncreaseDisabled}
              onClick={() => onChange({ maxColorCount: maxColorCount + 1 })}
              className="grid size-8 place-items-center text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </span>
        </div>
        <input
          type="range"
          min={maxColorCountMin}
          max={maxColorCountMax}
          step={1}
          value={maxColorCount}
          onChange={(event) => onChange({ maxColorCount: Number(event.target.value) })}
          aria-label={t("maxColorCount")}
          className="pattern-dimension-slider w-full accent-primary focus:outline-none"
        />
      </div>
    </section>
  );
}

function getColorDistanceModeLabel(mode: ColorDistanceMode, t: ReturnType<typeof useI18n>["t"]): string {
  if (mode === "rgb-fast") {
    return t("colorDistanceModeRgbFast");
  }
  if (mode === "weighted-rgb") {
    return t("colorDistanceModeWeightedRgb");
  }
  if (mode === "lab-delta-e") {
    return t("colorDistanceModeLabDeltaE");
  }
  return t("colorDistanceModeOklab");
}

function getColorDistanceModeDescription(mode: ColorDistanceMode, t: ReturnType<typeof useI18n>["t"]): string {
  if (mode === "rgb-fast") {
    return t("colorDistanceModeRgbFastDescription");
  }
  if (mode === "weighted-rgb") {
    return t("colorDistanceModeWeightedRgbDescription");
  }
  if (mode === "lab-delta-e") {
    return t("colorDistanceModeLabDeltaEDescription");
  }
  return t("colorDistanceModeOklabDescription");
}

function getDitherModeLabel(mode: DitherMode, t: ReturnType<typeof useI18n>["t"]): string {
  if (mode === "floyd-steinberg") {
    return t("ditherModeFloydSteinberg");
  }
  if (mode === "ordered") {
    return t("ditherModeOrdered");
  }
  return t("ditherModeOff");
}

function getDitherModeDescription(mode: DitherMode, t: ReturnType<typeof useI18n>["t"]): string {
  if (mode === "floyd-steinberg") {
    return t("ditherModeFloydSteinbergDescription");
  }
  if (mode === "ordered") {
    return t("ditherModeOrderedDescription");
  }
  return t("ditherModeOffDescription");
}
