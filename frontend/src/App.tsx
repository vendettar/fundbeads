import { Check, ChevronDown, Copy, Eraser, Eye, Hash, ImageUp, Languages, Minus, Paintbrush, Palette, PanelsTopLeft, Pipette, Plus, Redo2, Replace, RotateCcw, TableCellsSplit, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import type { ChangeEvent, DragEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { locales, normalizeLocale, useI18n } from "./i18n";
import { interfaceStyles, normalizeInterfaceStyle, useInterfaceStyle, type InterfaceStyleId } from "./interface-style";
import { mard221Palette, mardPalette } from "./palette";
import {
  createPatternEditState,
  erasePatternCells,
  getEffectivePattern,
  paintPatternCells,
  redoPatternEdit,
  replacePatternColor,
  resetPatternEdits,
  setPatternEditActiveColor,
  setPatternEditTool,
  undoPatternEdit,
  type PatternEditState,
  type PatternEditTool,
} from "./pattern-edit";
import {
  colorDistanceModes,
  defaultColorDistanceMode,
  defaultDitherMode,
  defaultMaxColorCount,
  defaultSmoothingLevel,
  dimensionsForAspectRatio,
  ditherModes,
  imageFileToPattern,
  maxColorCountMax,
  maxColorCountMin,
  normalizeColorDistanceMode,
  normalizeDitherMode,
  normalizeMaxColorCount,
  normalizePatternDimension,
  normalizeSmoothingLevel,
  patternDimensionMax,
  patternDimensionMin,
  patternLongestEdgePresets,
  readableTextColor,
  smoothingLevelMax,
  smoothingLevelMin,
  type ColorDistanceMode,
  type DitherMode,
  type MaxColorCount,
  type Pattern,
  type PatternProcessingOptions,
  type SourceImageSize,
} from "./pattern";
import { normalizeTheme, themes, useTheme, type ThemeId } from "./themes";

const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const acceptedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"] as const;
const baseCellSize = 22;
const baseAxisWidth = 38;
const gridViewportPadding = 24;
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 0.1;
const dimensionReprocessDelayMs = 140;

type ErrorMessageKey = "unsupportedImage" | "processFailed";
type ProcessFileOptions = {
  refreshPreview?: boolean;
  processingOptions?: PatternProcessingOptions;
};
type LongestEdgeChangeOptions = {
  reprocess?: "immediate" | "deferred";
};
type PatternAdjustmentOptions = {
  colorDistanceMode: ColorDistanceMode;
  ditherMode: DitherMode;
  smoothingLevel: number;
  maxColorCount: MaxColorCount;
};
type PatternEditStateUpdater = (currentState: PatternEditState) => PatternEditState;
type PatternPreviewOption = "showGrid" | "showCodes" | "showAxes";
type PatternPreviewOptions = Record<PatternPreviewOption, boolean>;
type CopyFeedbackStatus = "copySucceeded" | "copyFailed";
type CopyStatus = { target: "list"; status: CopyFeedbackStatus } | { target: "color"; code: string; status: CopyFeedbackStatus } | null;
type PatternEditStroke = {
  pointerId: number;
  tool: "paint" | "erase";
  cellIndexes: Set<number>;
  lastCellIndex: number;
};

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

const defaultPatternPreviewOptions: PatternPreviewOptions = {
  showGrid: true,
  showCodes: true,
  showAxes: true,
};

const mardPaletteGroups = mard221Palette.groups.map((group) => ({
  ...group,
  colors: mardPalette.filter((color) => color.family === group.prefix),
}));

function axisLabels(length: number) {
  return Array.from({ length }, (_, index) => index + 1);
}

function clampZoom(zoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, Number(zoom.toFixed(2))));
}

function cssAttributeString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\A ");
}

export function getPreferenceMenuPlacement(rect: Pick<DOMRect, "bottom" | "left" | "width">) {
  return {
    top: Math.ceil(rect.bottom + 6),
    left: Math.floor(rect.left),
    minWidth: Math.max(96, Math.ceil(rect.width)),
  };
}

export function getNextPreferenceOptionIndex(currentIndex: number, direction: 1 | -1, optionCount: number) {
  if (optionCount <= 0) {
    return 0;
  }
  return (currentIndex + direction + optionCount) % optionCount;
}

export function isAcceptedImageFile(file: Pick<File, "name" | "type">) {
  const mimeType = file.type.toLowerCase();
  if (acceptedImageMimeTypes.some((acceptedType) => acceptedType === mimeType)) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  return acceptedImageExtensions.some((extension) => fileName.endsWith(extension));
}

function formatUsagePercent(count: number, totalBeads: number) {
  if (totalBeads <= 0) {
    return "0.0%";
  }

  return `${((count / totalBeads) * 100).toFixed(1)}%`;
}

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

export function formatColorUsageLine(
  usage: Pattern["usage"][number],
  totalBeads: number,
  _paletteLabel: (color: Pattern["usage"][number]["color"]) => string,
  formatNumber: (value: number) => string,
) {
  return `${usage.color.code} x${formatNumber(usage.count)} (${formatUsagePercent(usage.count, totalBeads)})`;
}

export function formatColorUsageList(
  pattern: Pattern,
  _paletteLabel: (color: Pattern["usage"][number]["color"]) => string,
  formatNumber: (value: number) => string,
) {
  return [
    `Fundbeads Pattern ${pattern.width}x${pattern.height} / ${formatNumber(pattern.usage.length)} Colors / Total ${formatNumber(pattern.totalBeads)} Beads`,
    "Code\tCount\tPercent",
    ...pattern.usage.map((usage) => `${usage.color.code}\t${formatNumber(usage.count)}\t${formatUsagePercent(usage.count, pattern.totalBeads)}`),
  ].join("\n");
}

function collectStrokeCellIndexes(previousCellIndex: number, cellIndex: number, patternWidth: number) {
  if (!Number.isInteger(previousCellIndex) || !Number.isInteger(cellIndex) || !Number.isInteger(patternWidth) || patternWidth <= 0) {
    return [];
  }

  const previousX = previousCellIndex % patternWidth;
  const previousY = Math.floor(previousCellIndex / patternWidth);
  const nextX = cellIndex % patternWidth;
  const nextY = Math.floor(cellIndex / patternWidth);
  const deltaX = nextX - previousX;
  const deltaY = nextY - previousY;
  const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY));

  if (steps === 0) {
    return [cellIndex];
  }

  const seenIndexes = new Set<number>();
  const cellIndexes: number[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(previousX + (deltaX * step) / steps);
    const y = Math.round(previousY + (deltaY * step) / steps);
    const interpolatedIndex = y * patternWidth + x;
    if (!seenIndexes.has(interpolatedIndex)) {
      seenIndexes.add(interpolatedIndex);
      cellIndexes.push(interpolatedIndex);
    }
  }

  return cellIndexes;
}

export function App() {
  const [longestEdge, setLongestEdge] = useState(patternLongestEdgePresets[0]);
  const [patternEditState, setPatternEditState] = useState<PatternEditState | null>(null);
  const [fileName, setFileName] = useState("");
  const [errorKey, setErrorKey] = useState<ErrorMessageKey | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sourceImageSize, setSourceImageSize] = useState<SourceImageSize | null>(null);
  const [colorDistanceMode, setColorDistanceMode] = useState<ColorDistanceMode>(defaultColorDistanceMode);
  const [ditherMode, setDitherMode] = useState<DitherMode>(defaultDitherMode);
  const [smoothingLevel, setSmoothingLevel] = useState(defaultSmoothingLevel);
  const [maxColorCount, setMaxColorCount] = useState<MaxColorCount>(defaultMaxColorCount);
  const activeFileRef = useRef<File | null>(null);
  const processRunIdRef = useRef(0);
  const previewUrlRef = useRef("");
  const pendingDimensionTimerRef = useRef<number | null>(null);
  const patternGridRef = useRef<HTMLDivElement>(null);
  const pinnedColorCodeRef = useRef<string | null>(null);
  const { locale, setLocale, t, themeLabel, interfaceStyleLabel } = useI18n();
  const { theme, setTheme } = useTheme();
  const { interfaceStyle, setInterfaceStyle } = useInterfaceStyle();

  const effectivePattern = useMemo(() => (patternEditState ? getEffectivePattern(patternEditState, mardPalette) : null), [patternEditState]);
  const fallbackDimensions = useMemo(() => ({ width: longestEdge, height: longestEdge }), [longestEdge]);
  const outputDimensions = useMemo(
    () => (sourceImageSize ? dimensionsForAspectRatio(sourceImageSize, longestEdge) : effectivePattern ?? fallbackDimensions),
    [effectivePattern, fallbackDimensions, longestEdge, sourceImageSize],
  );
  const xLabels = useMemo(() => axisLabels(outputDimensions.width), [outputDimensions.width]);
  const yLabels = useMemo(() => axisLabels(outputDimensions.height), [outputDimensions.height]);
  const processingOptions = useMemo(
    () => ({ colorDistanceMode, ditherMode, smoothingLevel, maxColorCount }),
    [colorDistanceMode, ditherMode, maxColorCount, smoothingLevel],
  );

  const setGridFocusedColorCode = useCallback((colorCode: string | null) => {
    const grid = patternGridRef.current;
    if (!grid) {
      return;
    }

    if (colorCode) {
      grid.dataset.focusedColorCode = colorCode;
      return;
    }

    delete grid.dataset.focusedColorCode;
  }, []);

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
      setGridFocusedColorCode(nextPinnedColorCode);
      return nextPinnedColorCode;
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
    pinnedColorCodeRef.current = null;
    setGridFocusedColorCode(null);
  }, [effectivePattern, setGridFocusedColorCode]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      clearPendingDimensionReprocess();
    };
  }, []);

  function clearPendingDimensionReprocess() {
    if (pendingDimensionTimerRef.current === null) {
      return;
    }
    window.clearTimeout(pendingDimensionTimerRef.current);
    pendingDimensionTimerRef.current = null;
  }

  function clearPreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    setPreviewUrl("");
  }

  function updatePreviewUrl(file: File) {
    const nextPreviewUrl = URL.createObjectURL(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
  }

  async function processFile(file: File, nextLongestEdge: number, { refreshPreview = true, processingOptions: nextProcessingOptions = processingOptions }: ProcessFileOptions = {}) {
    clearPendingDimensionReprocess();
    const processRunId = processRunIdRef.current + 1;
    processRunIdRef.current = processRunId;
    const normalizedLongestEdge = normalizePatternDimension(nextLongestEdge);

    if (!isAcceptedImageFile(file)) {
      activeFileRef.current = null;
      setErrorKey("unsupportedImage");
      setPatternEditState(null);
      setSourceImageSize(null);
      setFileName("");
      setIsProcessing(false);
      clearPreviewUrl();
      return;
    }

    activeFileRef.current = file;
    setIsProcessing(true);
    setErrorKey(null);
    setFileName(file.name);
    if (refreshPreview) {
      setSourceImageSize(null);
      updatePreviewUrl(file);
    }

    try {
      const nextPattern = await imageFileToPattern(
        file,
        normalizedLongestEdge,
        (nextSourceImageSize) => {
          if (processRunIdRef.current === processRunId) {
            setSourceImageSize(nextSourceImageSize);
          }
        },
        nextProcessingOptions,
      );
      if (processRunIdRef.current === processRunId) {
        setPatternEditState(createPatternEditState(nextPattern, mardPalette));
      }
    } catch {
      if (processRunIdRef.current === processRunId) {
        activeFileRef.current = null;
        setPatternEditState(null);
        setSourceImageSize(null);
        clearPreviewUrl();
        setErrorKey("processFailed");
      }
    } finally {
      if (processRunIdRef.current === processRunId) {
        setIsProcessing(false);
      }
    }
  }

  function schedulePatternReprocess(nextLongestEdge: number, nextProcessingOptions: PatternProcessingOptions = processingOptions) {
    clearPendingDimensionReprocess();

    pendingDimensionTimerRef.current = window.setTimeout(() => {
      pendingDimensionTimerRef.current = null;
      const file = activeFileRef.current;
      if (file) {
        void processFile(file, nextLongestEdge, { refreshPreview: false, processingOptions: nextProcessingOptions });
      }
    }, dimensionReprocessDelayMs);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file, longestEdge, { processingOptions });
    }
  }

  async function onLongestEdgeChange(nextLongestEdge: number, { reprocess = "deferred" }: LongestEdgeChangeOptions = {}) {
    const normalizedLongestEdge = normalizePatternDimension(nextLongestEdge);
    setLongestEdge(normalizedLongestEdge);

    const file = activeFileRef.current;
    if (!file) {
      clearPendingDimensionReprocess();
      return;
    }

    if (reprocess === "immediate") {
      await processFile(file, normalizedLongestEdge, { refreshPreview: false, processingOptions });
      return;
    }

    schedulePatternReprocess(normalizedLongestEdge, processingOptions);
  }

  function onPatternAdjustmentChange(nextOptions: Partial<PatternAdjustmentOptions>) {
    const normalizedOptions = {
      colorDistanceMode: normalizeColorDistanceMode(nextOptions.colorDistanceMode ?? colorDistanceMode),
      ditherMode: normalizeDitherMode(nextOptions.ditherMode ?? ditherMode),
      smoothingLevel: normalizeSmoothingLevel(nextOptions.smoothingLevel ?? smoothingLevel),
      maxColorCount: normalizeMaxColorCount(nextOptions.maxColorCount ?? maxColorCount),
    };

    setColorDistanceMode(normalizedOptions.colorDistanceMode);
    setDitherMode(normalizedOptions.ditherMode);
    setSmoothingLevel(normalizedOptions.smoothingLevel);
    setMaxColorCount(normalizedOptions.maxColorCount);

    if (activeFileRef.current) {
      schedulePatternReprocess(longestEdge, normalizedOptions);
    }
  }

  async function onFileDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      await processFile(file, longestEdge, { processingOptions });
    }
  }

  function onFileDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingFile(true);
  }

  function onFileDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
  }

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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
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
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-bold text-foreground shadow-panel transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
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
                    options={locales.map((nextLocale) => ({ value: nextLocale.id, label: nextLocale.label, displayLabel: nextLocale.shortLabel }))}
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
                    options={themes.map((nextTheme) => ({ value: nextTheme.id, label: themeLabel(nextTheme.id), displayLabel: themeShortLabels[nextTheme.id] }))}
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
                    options={interfaceStyles.map((nextStyle) => ({
                      value: nextStyle.id,
                      label: interfaceStyleLabel(nextStyle.id),
                      displayLabel: interfaceStyleShortLabels[nextStyle.id],
                    }))}
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

      <section className="px-3 py-4 sm:px-4 lg:px-6">
        {effectivePattern && patternEditState ? (
          <div className="grid min-h-0 gap-4 xl:h-[calc(100svh-170px)] xl:grid-cols-[260px_minmax(0,1fr)_260px] xl:items-stretch">
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
              yLabels={yLabels}
              gridRef={patternGridRef}
            />
            {previewUrl ? (
              <PatternSideRail
                fileName={fileName}
                pattern={effectivePattern}
                previewUrl={previewUrl}
                onPreviewColorChange={handlePreviewColorChange}
                onPinnedColorToggle={handlePinnedColorToggle}
              />
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-[calc(100svh-170px)] items-stretch gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
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
              onDrop={onFileDrop}
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

type SelectOption = {
  value: string;
  label: string;
  selectedLabel?: string;
  displayLabel?: string;
  description?: string;
};

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
  const { t } = useI18n();

  return (
    <aside className={`grid-size-toolbar border border-border bg-card p-3 shadow-panel ${className}`} aria-label={t("gridSize")}>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <TableCellsSplit size={16} />
        <h2 className="text-sm font-semibold">{t("gridSize")}</h2>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {patternLongestEdgePresets.map((preset) => {
          const labelKey =
            preset === 52
              ? "presetSmall"
              : preset === 64
                ? "presetMedium"
                : "presetLarge";
          return (
            <button
              key={preset}
              type="button"
              onClick={() => void onLongestEdgeChange(preset, { reprocess: "immediate" })}
              className={`grid h-10 min-w-0 place-items-center rounded-md border px-1 text-center font-mono text-[11px] font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
                longestEdge === preset
                  ? "border-secondary bg-secondary text-secondary-foreground shadow-panel"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{t(labelKey)} {preset}</span>
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
        className="pattern-dimension-slider w-full accent-primary focus:outline-none focus:ring-2 focus:ring-ring"
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
          <span className="text-[11px] leading-snug text-muted-foreground">{t("colorDistanceModeHint")}</span>
        </div>
        <PreferenceSelect
          label={t("colorDistanceMode")}
          icon={<Pipette size={15} />}
          value={colorDistanceMode}
          onChange={(value) => onChange({ colorDistanceMode: normalizeColorDistanceMode(value) })}
          describedBy={colorDistanceDescriptionId}
          className="w-full justify-between text-xs"
          options={colorDistanceModes.map((mode) => ({
            value: mode,
            label: getColorDistanceModeLabel(mode, t),
            selectedLabel: getColorDistanceModeLabel(mode, t),
            displayLabel: colorDistanceModeShortLabels[mode],
            description: getColorDistanceModeDescription(mode, t),
          }))}
        />
        <p id={colorDistanceDescriptionId} className="min-w-0 break-words text-[10px] font-semibold leading-snug text-muted-foreground">{colorDistanceDescription}</p>
      </div>

      <div className="grid gap-2">
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">{t("ditherMode")}</span>
          <span className="text-[11px] leading-snug text-muted-foreground">{t("ditherModeHint")}</span>
        </div>
        <PreferenceSelect
          label={t("ditherMode")}
          icon={<Replace size={15} />}
          value={ditherMode}
          onChange={(value) => onChange({ ditherMode: normalizeDitherMode(value) })}
          describedBy={ditherDescriptionId}
          className="w-full justify-between text-xs"
          options={ditherModes.map((mode) => ({
            value: mode,
            label: getDitherModeLabel(mode, t),
            selectedLabel: getDitherModeLabel(mode, t),
            displayLabel: ditherModeShortLabels[mode],
            description: getDitherModeDescription(mode, t),
          }))}
        />
        <p id={ditherDescriptionId} className="min-w-0 break-words text-[10px] font-semibold leading-snug text-muted-foreground">{ditherDescription}</p>
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
          className="pattern-dimension-slider w-full accent-primary focus:outline-none focus:ring-2 focus:ring-ring"
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
          className="pattern-dimension-slider w-full accent-primary focus:outline-none focus:ring-2 focus:ring-ring"
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

function PreferenceSelect({
  label,
  icon,
  value,
  options,
  onChange,
  describedBy,
  className = "",
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  describedBy?: string;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPlacement, setMenuPlacement] = useState({ top: 0, left: 0, minWidth: 96 });
  const selectedOption = options.find((option) => option.value === value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedLabel = selectedOption?.selectedLabel ?? selectedOption?.displayLabel ?? selectedOption?.label ?? value;
  const buttonAriaLabel = `${label}: ${selectedLabel}`;

  const updateMenuPlacement = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setMenuPlacement(getPreferenceMenuPlacement(rect));
  }, []);

  const openMenu = useCallback(() => {
    updateMenuPlacement();
    setActiveIndex(selectedIndex);
    setIsOpen(true);
  }, [selectedIndex, updateMenuPlacement]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectOption = useCallback(
    (option: SelectOption) => {
      onChange(option.value);
      closeMenu();
      buttonRef.current?.focus();
    },
    [closeMenu, onChange],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    }

    function onWindowChange() {
      updateMenuPlacement();
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [closeMenu, isOpen, updateMenuPlacement]);

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      setActiveIndex((currentIndex) => getNextPreferenceOptionIndex(currentIndex, 1, options.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      setActiveIndex((currentIndex) => getNextPreferenceOptionIndex(currentIndex, -1, options.length));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      const activeOption = options[activeIndex];
      if (activeOption) {
        selectOption(activeOption);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={buttonAriaLabel}
        aria-describedby={describedBy}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => {
          if (isOpen) {
            closeMenu();
            return;
          }
          openMenu();
        }}
        onKeyDown={onButtonKeyDown}
        className={`preference-select-control inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      >
        <span className="pointer-events-none text-muted-foreground">{icon}</span>
        <span className="pointer-events-none min-w-6 max-w-24 truncate">{selectedLabel}</span>
        <ChevronDown className="pointer-events-none text-muted-foreground" size={15} />
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              aria-label={label}
              className="preference-select-menu fixed z-50 grid max-w-[min(22rem,calc(100vw-1rem))] gap-1 rounded-md border border-border bg-card p-1 text-sm font-semibold text-foreground shadow-panel"
              style={{
                top: menuPlacement.top,
                left: menuPlacement.left,
                minWidth: menuPlacement.minWidth,
              }}
            >
              {options.map((option, optionIndex) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                  onClick={() => selectOption(option)}
                  className={`grid min-h-9 w-full gap-1 rounded px-3 py-2 text-left transition ${
                    optionIndex === activeIndex || option.value === value ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span className="min-w-0 truncate">{option.label}</span>
                    {option.displayLabel ? <span className="shrink-0 font-mono text-xs text-muted-foreground">{option.displayLabel}</span> : null}
                  </span>
                  {option.description ? <span className="min-w-0 break-words text-[11px] font-medium leading-snug text-muted-foreground">{option.description}</span> : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function UploadWorkspace({
  isDraggingFile,
  onDrop,
  onDragOver,
  onDragLeave,
  onKeyDown,
}: {
  isDraggingFile: boolean;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLLabelElement>) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="upload-preview-placeholder h-full border border-border bg-card p-3 shadow-panel">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`upload-preview-canvas grid h-full min-h-[420px] place-items-center border px-4 py-8 text-center transition sm:px-6 ${
          isDraggingFile ? "border-primary bg-muted shadow-panel" : "border-border bg-background"
        }`}
      >
        <span className="grid w-full max-w-4xl gap-5">
          <label
            htmlFor="image-upload"
            role="button"
            tabIndex={0}
            aria-describedby="upload-dropzone-description"
            onKeyDown={onKeyDown}
            className="upload-preview-frame mx-auto grid aspect-[4/3] w-full max-w-2xl cursor-pointer place-items-center border border-dashed border-border bg-muted p-5 rounded-lg transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className="grid justify-items-center rounded-md border border-border bg-card px-6 py-5 shadow-panel">
              <span className="grid size-16 place-items-center rounded-md border border-border bg-background text-primary">
                <ImageUp size={34} />
              </span>
              <span className="mt-4 text-2xl font-semibold">{t("dropzoneTitle")}</span>
              <span id="upload-dropzone-description" className="mt-2 max-w-lg text-sm text-muted-foreground">
                {t("dropzoneBody")}
              </span>
            </span>
          </label>
          <span className="mx-auto inline-flex rounded-md border border-border bg-card px-3 py-2 text-xs font-bold uppercase text-muted-foreground shadow-panel">
            {t("dropzoneHint")}
          </span>
        </span>
      </div>
    </section>
  );
}

function ImagePreview({ fileName, previewUrl }: { fileName: string; previewUrl: string }) {
  const { t } = useI18n();

  return (
    <section className="border border-border bg-card p-3 shadow-panel">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2 className="text-sm font-semibold">{t("originalPreviewTitle")}</h2>
        <span className="truncate text-xs font-semibold text-muted-foreground">{fileName}</span>
      </div>
      <div className="mt-3 grid place-items-center overflow-hidden bg-background">
        <img src={previewUrl} alt={t("originalPreviewAlt", { fileName })} className="original-preview-image block max-h-[36vh] max-w-full object-contain" />
      </div>
    </section>
  );
}

function PatternSideRail({
  fileName,
  pattern,
  previewUrl,
  onPreviewColorChange,
  onPinnedColorToggle,
}: {
  fileName: string;
  pattern: Pattern;
  previewUrl: string;
  onPreviewColorChange: (colorCode: string | null) => void;
  onPinnedColorToggle: (colorCode: string) => string | null;
}) {
  return (
    <aside className="grid gap-3 xl:h-full xl:min-h-0 xl:self-stretch xl:grid-rows-[auto_auto_minmax(0,1fr)]">
      <ImagePreview fileName={fileName} previewUrl={previewUrl} />
      <PatternStatsCard pattern={pattern} />
      <ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern} onPreviewColorChange={onPreviewColorChange} onPinnedColorToggle={onPinnedColorToggle} compact />
    </aside>
  );
}

function PatternStatsCard({ pattern }: { pattern: Pattern }) {
  const { formatNumber, t } = useI18n();

  return (
    <section className="pattern-side-stats border border-border bg-card p-3 shadow-panel" aria-label={t("summaryTitle")}>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Palette size={16} />
        <h2 className="text-sm font-semibold">{t("summaryTitle")}</h2>
      </div>
      <p className="mt-3 font-mono text-sm font-bold text-foreground">{t("headerStats", { colors: formatNumber(pattern.usage.length), total: formatNumber(pattern.totalBeads) })}</p>
    </section>
  );
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid bg-black/55 p-3 sm:p-6" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mard-palette-dialog-title"
        className="m-auto grid max-h-[90vh] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-border bg-card shadow-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="mard-palette-dialog-title" className="truncate text-lg font-semibold">
              {t("mardPaletteTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={t("closeDialog")}
            title={t("closeDialog")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-auto p-4">
          <MardPaletteShowcase />
        </div>
      </section>
    </div>,
    document.body,
  );
}

function MardPaletteShowcase() {
  const { formatNumber, paletteLabel, t } = useI18n();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedCode) {
      return undefined;
    }
    const timer = setTimeout(() => setCopiedCode(null), 1500);
    return () => clearTimeout(timer);
  }, [copiedCode]);

  async function handleCopy(hex: string, code: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(hex.toUpperCase());
        setCopiedCode(code);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("mardPaletteTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("mardPaletteSummary", {
            colors: formatNumber(mard221Palette.colorCount),
            families: formatNumber(mard221Palette.groups.length),
          })}
        </p>
      </div>
      <div className="grid gap-4">
        {mardPaletteGroups.map((group) => (
          <section key={group.prefix} className="border border-border bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-mono text-sm font-bold text-foreground">
                {t("paletteFamilyTitle", { family: group.prefix, count: formatNumber(group.colors.length) })}
              </h3>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
              {group.colors.map((color) => (
                <button
                  key={color.code}
                  type="button"
                  onClick={() => void handleCopy(color.hex, color.code)}
                  className={[
                    "flex min-w-0 items-center text-left gap-2 border bg-card p-2 cursor-pointer transition hover:bg-muted hover-shake w-full focus:outline-none focus:ring-2 focus:ring-ring",
                    copiedCode === color.code ? "border-primary" : "border-border",
                  ].join(" ")}
                  title={t("copyColorLine", { code: color.code })}
                >
                  <span className="size-7 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }} />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-bold text-foreground">{color.code}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {copiedCode === color.code ? t("copySucceeded") : color.hex.toUpperCase()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function PatternGrid({
  pattern,
  editState,
  onEditStateChange,
  xLabels,
  yLabels,
  gridRef,
}: {
  pattern: Pattern;
  editState: PatternEditState;
  onEditStateChange: (updater: PatternEditStateUpdater) => void;
  xLabels: number[];
  yLabels: number[];
  gridRef: RefObject<HTMLDivElement | null>;
}) {
  const { paletteLabel, t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<PatternEditStroke | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [isReplacePanelOpen, setIsReplacePanelOpen] = useState(false);
  const [replaceSourceCode, setReplaceSourceCode] = useState(editState.activeColorCode);
  const [replaceTargetCode, setReplaceTargetCode] = useState(editState.activeColorCode);
  const [replaceStatusKey, setReplaceStatusKey] = useState<"patternEditReplaceNoSource" | null>(null);
  const [previewOptions, setPreviewOptions] = useState(defaultPatternPreviewOptions);
  const focusRules = useMemo(
    () =>
      pattern.usage
        .map(({ color }) => {
          const colorCode = cssAttributeString(color.code);
          return `.pattern-grid-board[data-focused-color-code="${colorCode}"] .pattern-cell[data-color-code]:not([data-color-code="${colorCode}"]) { background-color: var(--beads-background) !important; color: transparent !important; }`;
        })
        .join("\n"),
    [pattern.usage],
  );

  const columns = previewOptions.showAxes ? `${baseAxisWidth}px repeat(${pattern.width}, ${baseCellSize}px) ${baseAxisWidth}px` : `repeat(${pattern.width}, ${baseCellSize}px)`;
  const baseWidth = pattern.width * baseCellSize + (previewOptions.showAxes ? baseAxisWidth * 2 : 0);
  const baseHeight = pattern.height * baseCellSize + (previewOptions.showAxes ? baseCellSize * 2 : 0);
  const availableWidth = Math.max(1, viewportSize.width - gridViewportPadding);
  const availableHeight = Math.max(1, viewportSize.height - gridViewportPadding);
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
  const effectiveScale = fitScale * zoom;
  const scaledWidth = baseWidth * effectiveScale;
  const scaledHeight = baseHeight * effectiveScale;
  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const activeColor = mardPalette.find((color) => color.code === editState.activeColorCode) ?? mardPalette[0];
  const replaceSourceColor = pattern.usage.find(({ color }) => color.code === replaceSourceCode)?.color;
  const replaceTargetColor = mardPalette.find((color) => color.code === replaceTargetCode);
  const sourceColorCodes = useMemo(() => new Set(pattern.usage.map(({ color }) => color.code)), [pattern.usage]);
  const canUndo = editState.undoStack.length > 0;
  const canRedo = editState.redoStack.length > 0;
  const hasManualEdits = Object.keys(editState.overrides).length > 0;
  const canApplyReplace = replaceSourceCode !== replaceTargetCode && sourceColorCodes.has(replaceSourceCode);

  const changeZoom = useCallback((direction: "in" | "out") => {
    setZoom((currentZoom) => clampZoom(currentZoom + (direction === "in" ? zoomStep : -zoomStep)));
  }, []);

  const togglePreviewOption = useCallback((option: PatternPreviewOption) => {
    setPreviewOptions((currentOptions) => ({
      ...currentOptions,
      [option]: !currentOptions[option],
    }));
  }, []);

  const updateEditState = useCallback(
    (updater: PatternEditStateUpdater) => {
      setReplaceStatusKey(null);
      onEditStateChange(updater);
    },
    [onEditStateChange],
  );

  useEffect(() => {
    setZoom(1);
  }, [pattern.width, pattern.height]);

  useEffect(() => {
    return () => {
      strokeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    function updateViewportSize() {
      if (!viewport) {
        return;
      }
      setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    }

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      setZoom((currentZoom) => clampZoom(currentZoom + (event.deltaY < 0 ? zoomStep : -zoomStep)));
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });

    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const defaultSourceCode = sourceColorCodes.has(editState.activeColorCode) ? editState.activeColorCode : pattern.usage[0]?.color.code;
    if (defaultSourceCode && !sourceColorCodes.has(replaceSourceCode)) {
      setReplaceSourceCode(defaultSourceCode);
    }
    if (!mardPalette.some((color) => color.code === replaceTargetCode)) {
      setReplaceTargetCode(editState.activeColorCode);
    }
  }, [editState.activeColorCode, pattern.usage, replaceSourceCode, replaceTargetCode, sourceColorCodes]);

  function switchTool(tool: PatternEditTool) {
    updateEditState((currentState) => setPatternEditTool(currentState, tool));
    if (tool === "replace") {
      setIsReplacePanelOpen(true);
    }
  }

  function selectActiveColor(colorCode: string) {
    updateEditState((currentState) => setPatternEditActiveColor(setPatternEditTool(currentState, "paint"), colorCode, mardPalette));
    setReplaceTargetCode(colorCode);
    if (sourceColorCodes.has(colorCode)) {
      setReplaceSourceCode(colorCode);
    }
  }

  function applyReplace() {
    if (!canApplyReplace) {
      setReplaceStatusKey("patternEditReplaceNoSource");
      return;
    }

    updateEditState((currentState) => replacePatternColor(currentState, replaceSourceCode, replaceTargetCode, mardPalette));
    setReplaceStatusKey(null);
  }

  function getCellIndexFromTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) {
      return null;
    }
    const cell = target.closest<HTMLElement>("[data-cell-index]");
    if (!cell?.dataset.cellIndex) {
      return null;
    }
    const cellIndex = Number(cell.dataset.cellIndex);
    return Number.isInteger(cellIndex) ? cellIndex : null;
  }

  function getCellIndexFromPointerEvent(event: ReactPointerEvent<HTMLElement>) {
    const targetCellIndex = getCellIndexFromTarget(event.target);
    if (targetCellIndex !== null) {
      return targetCellIndex;
    }
    return getCellIndexFromTarget(document.elementFromPoint(event.clientX, event.clientY));
  }

  function addStrokeCell(event: ReactPointerEvent<HTMLElement>) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) {
      return;
    }
    const cellIndex = getCellIndexFromPointerEvent(event);
    if (cellIndex !== null) {
      const previousCellIndex = stroke.lastCellIndex;
      const nextCellIndexes = collectStrokeCellIndexes(previousCellIndex, cellIndex, pattern.width);
      nextCellIndexes.forEach((nextCellIndex) => stroke.cellIndexes.add(nextCellIndex));
      stroke.lastCellIndex = cellIndex;
    }
  }

  function commitStroke(pointerId: number) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== pointerId) {
      return;
    }
    strokeRef.current = null;

    const cellIndexes = [...stroke.cellIndexes];
    if (cellIndexes.length === 0) {
      return;
    }

    updateEditState((currentState) =>
      stroke.tool === "paint"
        ? paintPatternCells(currentState, cellIndexes, currentState.activeColorCode, mardPalette)
        : erasePatternCells(currentState, cellIndexes),
    );
  }

  function clearStroke(pointerId: number) {
    if (strokeRef.current?.pointerId === pointerId) {
      strokeRef.current = null;
    }
  }

  function releaseBoardPointerCapture(board: HTMLDivElement, pointerId: number) {
    if (board.hasPointerCapture(pointerId)) {
      board.releasePointerCapture(pointerId);
    }
  }

  function onBoardPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || editState.tool === "view" || editState.tool === "replace") {
      return;
    }

    const cellIndex = getCellIndexFromPointerEvent(event);
    if (cellIndex === null) {
      return;
    }

    event.preventDefault();

    if (editState.tool === "pick") {
      const pickedColorCode = pattern.cells[cellIndex]?.color.code;
      if (pickedColorCode) {
        updateEditState((currentState) => setPatternEditTool(setPatternEditActiveColor(currentState, pickedColorCode, mardPalette), "paint"));
        setReplaceSourceCode(pickedColorCode);
        setReplaceTargetCode(pickedColorCode);
      }
      return;
    }

    if (editState.tool !== "paint" && editState.tool !== "erase") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    strokeRef.current = {
      pointerId: event.pointerId,
      tool: editState.tool,
      cellIndexes: new Set([cellIndex]),
      lastCellIndex: cellIndex,
    };
  }

  function onBoardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    addStrokeCell(event);
  }

  function onBoardPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    commitStroke(event.pointerId);
    releaseBoardPointerCapture(event.currentTarget, event.pointerId);
  }

  function onBoardPointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    commitStroke(event.pointerId);
    releaseBoardPointerCapture(event.currentTarget, event.pointerId);
  }

  function onBoardPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    clearStroke(event.pointerId);
    releaseBoardPointerCapture(event.currentTarget, event.pointerId);
  }

  return (
    <section className="flex h-full min-h-0 flex-col border border-border bg-card shadow-panel">
      <div className="grid gap-2 border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-sm font-bold text-muted-foreground">
            {t("gridZoomStatus", { width: pattern.width, height: pattern.height, zoom: zoomLabel })}
          </div>
          <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => changeZoom("out")}
              disabled={zoom <= minZoom}
              className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("zoomOut")}
              title={t("zoomOut")}
            >
              <ZoomOut size={16} />
            </button>
            <span className="min-w-14 px-2 text-center font-mono text-xs font-bold text-muted-foreground">{zoomLabel}</span>
            <button
              type="button"
              onClick={() => changeZoom("in")}
              disabled={zoom >= maxZoom}
              className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("zoomIn")}
              title={t("zoomIn")}
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        <div className="pattern-edit-toolbar flex flex-wrap items-center gap-2" aria-label={t("patternEditToolbar")}>
          <div className="inline-flex min-w-0 items-center rounded-md border border-border bg-background p-1">
            {[
              { tool: "view" as const, label: t("patternEditView"), icon: <Eye size={14} /> },
              { tool: "paint" as const, label: t("patternEditPaint"), icon: <Paintbrush size={14} /> },
              { tool: "pick" as const, label: t("patternEditPick"), icon: <Pipette size={14} /> },
              { tool: "erase" as const, label: t("patternEditErase"), icon: <Eraser size={14} /> },
              { tool: "replace" as const, label: t("patternEditReplace"), icon: <Replace size={14} /> },
            ].map(({ tool, label, icon }) => (
              <button
                key={tool}
                type="button"
                aria-pressed={editState.tool === tool}
                title={label}
                onClick={() => switchTool(tool)}
                className={`inline-flex h-8 min-w-0 items-center gap-1 rounded px-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
                  editState.tool === tool ? "bg-secondary text-secondary-foreground shadow-panel" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <label className="inline-flex h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-bold text-muted-foreground">
            <span className="size-5 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${activeColor.r} ${activeColor.g} ${activeColor.b})` }} />
            <span className="hidden sm:inline">{t("patternEditActiveColor")}</span>
            <span className="font-mono text-foreground">{activeColor.code}</span>
            <select
              value={editState.activeColorCode}
              onChange={(event) => selectActiveColor(event.target.value)}
              className="h-7 min-w-24 rounded border border-border bg-card px-1 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("patternEditActiveColor")}
            >
              {mardPalette.map((color) => (
                <option key={color.code} value={color.code}>
                  {color.code} {paletteLabel(color)}
                </option>
              ))}
            </select>
          </label>

          <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => updateEditState(undoPatternEdit)}
              disabled={!canUndo}
              className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("patternEditUndo")}
              title={t("patternEditUndo")}
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => updateEditState(redoPatternEdit)}
              disabled={!canRedo}
              className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("patternEditRedo")}
              title={t("patternEditRedo")}
            >
              <Redo2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => updateEditState(resetPatternEdits)}
              disabled={!hasManualEdits}
              className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("patternEditReset")}
              title={t("patternEditReset")}
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsReplacePanelOpen((isOpen) => !isOpen)}
            className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-bold text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-expanded={isReplacePanelOpen}
            aria-controls="pattern-edit-replace-panel"
          >
            <Replace size={14} />
            <span>{t("patternEditReplace")}</span>
          </button>
        </div>
      </div>
      {isReplacePanelOpen ? (
        <div id="pattern-edit-replace-panel" className="grid gap-2 border-b border-border bg-background px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="grid min-w-0 gap-1 text-xs font-bold text-muted-foreground">
            <span>{t("patternEditReplaceSource")}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-7 shrink-0 border border-black/30"
                style={{ backgroundColor: replaceSourceColor ? `rgb(${replaceSourceColor.r} ${replaceSourceColor.g} ${replaceSourceColor.b})` : "transparent" }}
              />
              <select
                value={replaceSourceCode}
                onChange={(event) => setReplaceSourceCode(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {pattern.usage.map(({ color, count }) => (
                  <option key={color.code} value={color.code}>
                    {color.code} {paletteLabel(color)} x{count}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-bold text-muted-foreground">
            <span>{t("patternEditReplaceTarget")}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-7 shrink-0 border border-black/30"
                style={{ backgroundColor: replaceTargetColor ? `rgb(${replaceTargetColor.r} ${replaceTargetColor.g} ${replaceTargetColor.b})` : "transparent" }}
              />
              <select
                value={replaceTargetCode}
                onChange={(event) => setReplaceTargetCode(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {mardPalette.map((color) => (
                  <option key={color.code} value={color.code}>
                    {color.code} {paletteLabel(color)}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <button
            type="button"
            disabled={!canApplyReplace}
            onClick={applyReplace}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} />
            <span>{t("patternEditApplyReplace")}</span>
          </button>
          {replaceStatusKey ? <p className="text-xs font-semibold text-muted-foreground sm:col-span-3">{t(replaceStatusKey)}</p> : null}
        </div>
      ) : null}
      <style className="pattern-focus-rules">{focusRules}</style>
      <div ref={viewportRef} className="h-[62vh] min-h-[260px] overflow-auto bg-card xl:h-auto xl:min-h-0 xl:flex-1">
        <div className="flex min-h-full min-w-full p-3">
          <div className="m-auto shrink-0" style={{ width: scaledWidth, height: scaledHeight }}>
            <div
              ref={gridRef}
              className="pattern-grid-board grid origin-top-left"
              onPointerDown={onBoardPointerDown}
              onPointerMove={onBoardPointerMove}
              onPointerUp={onBoardPointerUp}
              onPointerLeave={onBoardPointerLeave}
              onPointerCancel={onBoardPointerCancel}
              onLostPointerCapture={onBoardPointerCancel}
              style={{
                gridTemplateColumns: columns,
                width: baseWidth,
                height: baseHeight,
                transform: `scale(${effectiveScale})`,
              }}
            >
              {previewOptions.showAxes ? (
                <>
                  <AxisCorner showGrid={previewOptions.showGrid} />
                  {xLabels.map((label) => (
                    <AxisCell key={`top-${label}`} label={label} major={label % 10 === 0 || label % 5 === 0} showGrid={previewOptions.showGrid} />
                  ))}
                  <AxisCorner showGrid={previewOptions.showGrid} />
                </>
              ) : null}

              {yLabels.map((row) => (
                <Row key={row} row={row} pattern={pattern} showGrid={previewOptions.showGrid} showCodes={previewOptions.showCodes} showAxes={previewOptions.showAxes} />
              ))}

              {previewOptions.showAxes ? (
                <>
                  <AxisCorner showGrid={previewOptions.showGrid} />
                  {xLabels.map((label) => (
                    <AxisCell key={`bottom-${label}`} label={label} major={label % 10 === 0 || label % 5 === 0} showGrid={previewOptions.showGrid} />
                  ))}
                  <AxisCorner showGrid={previewOptions.showGrid} />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-2" aria-label={t("patternPreviewToolbar")}>
          {[
            { option: "showGrid" as const, label: t("patternPreviewShowGrid"), icon: <TableCellsSplit size={14} /> },
            { option: "showCodes" as const, label: t("patternPreviewShowCodes"), icon: <Hash size={14} /> },
            { option: "showAxes" as const, label: t("patternPreviewShowAxes"), icon: <PanelsTopLeft size={14} /> },
          ].map(({ option, label, icon }) => (
            <button
              key={option}
              type="button"
              aria-pressed={previewOptions[option]}
              title={label}
              onClick={() => togglePreviewOption(option)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
                previewOptions[option] ? "bg-secondary text-secondary-foreground shadow-panel" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({ row, pattern, showGrid, showCodes, showAxes }: { row: number; pattern: Pattern; showGrid: boolean; showCodes: boolean; showAxes: boolean }) {
  const { paletteLabel, t } = useI18n();
  const start = (row - 1) * pattern.width;
  const rowCells = pattern.cells.slice(start, start + pattern.width);

  return (
    <>
      {showAxes ? <AxisCell label={row} major={row % 10 === 0 || row % 5 === 0} showGrid={showGrid} /> : null}
      {rowCells.map((cell, cellOffset) => {
        const cellIndex = start + cellOffset;
        const majorX = cell.x % 10 === 0;
        const minorX = cell.x % 5 === 0;
        const majorY = cell.y % 10 === 0;
        const minorY = cell.y % 5 === 0;

        return (
          <div
            key={`${cell.x}-${cell.y}`}
            data-cell-index={cellIndex}
            data-color-code={cell.color.code}
            data-x={cell.x}
            data-y={cell.y}
            className={[
              "pattern-cell grid h-[22px] w-[22px] place-items-center font-mono text-[9px] font-bold leading-none",
              showGrid ? "border-b border-r border-black/40" : "",
              showGrid && majorX ? "border-r-[3px] border-r-black" : "",
              showGrid && minorX && !majorX ? "border-r-2 border-r-black/70 border-r-dashed" : "",
              showGrid && majorY ? "border-b-[3px] border-b-black" : "",
              showGrid && minorY && !majorY ? "border-b-2 border-b-black/70 border-b-dashed" : "",
            ].join(" ")}
            style={{
              backgroundColor: `rgb(${cell.color.r} ${cell.color.g} ${cell.color.b})`,
              color: showCodes ? readableTextColor(cell.color) : "transparent",
            }}
            title={t("cellTitle", { x: cell.x, y: cell.y, code: cell.color.code, label: paletteLabel(cell.color) })}
          >
            {showCodes ? cell.color.code : null}
          </div>
        );
      })}
      {showAxes ? <AxisCell label={row} major={row % 10 === 0 || row % 5 === 0} showGrid={showGrid} /> : null}
    </>
  );
}

function AxisCell({ label, major, showGrid }: { label: number; major: boolean; showGrid: boolean }) {
  return (
    <div
      className={`grid h-[22px] w-full place-items-center bg-muted px-1 font-mono text-[10px] font-bold ${showGrid ? "border-b border-r border-border" : ""} ${
        major ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

function AxisCorner({ showGrid }: { showGrid: boolean }) {
  return <div className={`h-[22px] w-full bg-foreground ${showGrid ? "border-b border-r border-border" : ""}`} />;
}

function ColorUsageDetail({
  className = "",
  pattern,
  onPreviewColorChange,
  onPinnedColorToggle,
  compact = false,
}: {
  className?: string;
  pattern: Pattern;
  onPreviewColorChange: (colorCode: string | null) => void;
  onPinnedColorToggle: (colorCode: string) => string | null;
  compact?: boolean;
}) {
  const { formatNumber, paletteLabel, t } = useI18n();
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [pinnedColorCode, setPinnedColorCode] = useState<string | null>(null);
  const listCopySucceeded = copyStatus?.target === "list" && copyStatus.status === "copySucceeded";
  const listCopyFailed = copyStatus?.target === "list" && copyStatus.status === "copyFailed";

  useEffect(() => {
    if (!copyStatus) {
      return undefined;
    }
    const timer = setTimeout(() => setCopyStatus(null), 1500);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  useEffect(() => {
    setPinnedColorCode(null);
  }, [pattern]);

  async function copyText(text: string, target: { target: "list" } | { target: "color"; code: string }) {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard is not available.");
      }

      await navigator.clipboard.writeText(text);
      setCopyStatus({ ...target, status: "copySucceeded" });
    } catch {
      setCopyStatus({ ...target, status: "copyFailed" });
    }
  }

  function togglePinnedColor(colorCode: string) {
    setPinnedColorCode(onPinnedColorToggle(colorCode));
  }

  return (
    <section className={`color-usage-detail grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-border bg-card p-3 shadow-panel ${className}`} aria-label={t("colorDetailTitle")}>
      <div className="border-b border-border pb-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("colorDetailTitle")}</h3>
          <button
            type="button"
            onClick={() => void copyText(formatColorUsageList(pattern, paletteLabel, formatNumber), { target: "list" })}
            className={[
              "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring scale-75 origin-right",
              listCopySucceeded
                ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                : listCopyFailed
                  ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border bg-background text-foreground",
            ].join(" ")}
          >
            {listCopySucceeded ? <Check size={13} /> : listCopyFailed ? <X size={13} /> : <Copy size={13} />}
            <span>{copyStatus?.target === "list" ? t(copyStatus.status) : t("copyList")}</span>
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t("colorDetailHint")}</p>
      </div>
      <div className={compact ? "mt-2 grid max-h-[28vh] overflow-y-auto xl:max-h-none xl:min-h-0" : "mt-2 grid"}>
        <div className={compact ? "grid grid-cols-[minmax(0,1fr)_3.5rem_3.75rem_2rem] border-b border-border bg-muted px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground" : "grid grid-cols-[minmax(16rem,1fr)_7rem_7rem_3rem] border-b border-border bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground"}>
          <span>{t("colorColumn")}</span>
          <span className="text-right">{t("countColumn")}</span>
          <span className="text-right">{t("percentColumn")}</span>
          <span className="sr-only">{t("copyColorLine", { code: "" })}</span>
        </div>
        {pattern.usage.map(({ color, count }) => {
          const isPinned = pinnedColorCode === color.code;
          const colorCopyStatus = copyStatus?.target === "color" && copyStatus.code === color.code ? copyStatus.status : null;
          const colorCopySucceeded = colorCopyStatus === "copySucceeded";
          const colorCopyFailed = colorCopyStatus === "copyFailed";

          return (
            <div
              key={color.code}
              role="button"
              tabIndex={0}
              aria-pressed={isPinned}
              onClick={() => togglePinnedColor(color.code)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  togglePinnedColor(color.code);
                }
              }}
              onMouseEnter={() => onPreviewColorChange(color.code)}
              onMouseLeave={() => onPreviewColorChange(null)}
              onFocus={() => onPreviewColorChange(color.code)}
              onBlur={() => onPreviewColorChange(null)}
              className={[
                compact
                  ? "grid grid-cols-[minmax(0,1fr)_3.5rem_3.75rem_2rem] items-center border-b border-border px-2 py-2 transition last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
                  : "grid grid-cols-[minmax(16rem,1fr)_7rem_7rem_3rem] items-center border-b border-border px-3 py-2 transition last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring",
                isPinned ? "bg-primary/10 ring-2 ring-inset ring-primary" : "",
              ].join(" ")}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-7 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }} />
                <span className="block font-mono text-xs font-bold text-foreground">{color.code}</span>
              </div>
              <span className="text-right font-mono text-xs font-bold text-foreground">{formatNumber(count)}</span>
              <span className="text-right font-mono text-xs font-bold text-muted-foreground">{formatUsagePercent(count, pattern.totalBeads)}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void copyText(formatColorUsageLine({ color, count }, pattern.totalBeads, paletteLabel, formatNumber), { target: "color", code: color.code });
                }}
                className={[
                  "ml-auto grid size-7 place-items-center rounded-md transition hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                  colorCopySucceeded
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : colorCopyFailed
                      ? "bg-destructive/10 text-destructive"
                      : "text-muted-foreground",
                ].join(" ")}
                aria-label={colorCopyStatus ? t(colorCopyStatus) : t("copyColorLine", { code: color.code })}
                title={colorCopyStatus ? t(colorCopyStatus) : t("copyColorLine", { code: color.code })}
              >
                {colorCopySucceeded ? <Check size={14} /> : colorCopyFailed ? <X size={14} /> : <Copy size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
