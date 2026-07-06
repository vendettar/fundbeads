import { ChevronDown, ImageUp, Languages, Loader2, Minus, Paintbrush, Palette, PanelsTopLeft, Plus, TableCellsSplit, ZoomIn, ZoomOut } from "lucide-react";
import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { locales, normalizeLocale, useI18n } from "./i18n";
import { interfaceStyles, normalizeInterfaceStyle, useInterfaceStyle, type InterfaceStyleId } from "./interface-style";
import { mard221Palette, mardPalette } from "./palette";
import {
  dimensionsForAspectRatio,
  imageFileToPattern,
  normalizePatternDimension,
  patternDimensionMax,
  patternDimensionMin,
  patternLongestEdgePresets,
  readableTextColor,
  type Pattern,
  type SourceImageSize,
} from "./pattern";
import { normalizeTheme, themes, useTheme, type ThemeId } from "./themes";

const acceptedTypes = ["image/jpeg", "image/png"];
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
};
type LongestEdgeChangeOptions = {
  reprocess?: "immediate" | "deferred";
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

export function App() {
  const [longestEdge, setLongestEdge] = useState(patternLongestEdgePresets[0]);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [fileName, setFileName] = useState("");
  const [errorKey, setErrorKey] = useState<ErrorMessageKey | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sourceImageSize, setSourceImageSize] = useState<SourceImageSize | null>(null);
  const activeFileRef = useRef<File | null>(null);
  const processRunIdRef = useRef(0);
  const previewUrlRef = useRef("");
  const pendingDimensionTimerRef = useRef<number | null>(null);
  const { locale, setLocale, t, themeLabel, interfaceStyleLabel } = useI18n();
  const { theme, setTheme } = useTheme();
  const { interfaceStyle, setInterfaceStyle } = useInterfaceStyle();

  const fallbackDimensions = useMemo(() => ({ width: longestEdge, height: longestEdge }), [longestEdge]);
  const outputDimensions = useMemo(
    () => (sourceImageSize ? dimensionsForAspectRatio(sourceImageSize, longestEdge) : pattern ?? fallbackDimensions),
    [fallbackDimensions, longestEdge, pattern, sourceImageSize],
  );
  const xLabels = useMemo(() => axisLabels(outputDimensions.width), [outputDimensions.width]);
  const yLabels = useMemo(() => axisLabels(outputDimensions.height), [outputDimensions.height]);

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

  async function processFile(file: File, nextLongestEdge: number, { refreshPreview = true }: ProcessFileOptions = {}) {
    clearPendingDimensionReprocess();
    const processRunId = processRunIdRef.current + 1;
    processRunIdRef.current = processRunId;
    const normalizedLongestEdge = normalizePatternDimension(nextLongestEdge);

    if (!acceptedTypes.includes(file.type)) {
      activeFileRef.current = null;
      setErrorKey("unsupportedImage");
      setPattern(null);
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
      const nextPattern = await imageFileToPattern(file, normalizedLongestEdge, (nextSourceImageSize) => {
        if (processRunIdRef.current === processRunId) {
          setSourceImageSize(nextSourceImageSize);
        }
      });
      if (processRunIdRef.current === processRunId) {
        setPattern(nextPattern);
      }
    } catch {
      if (processRunIdRef.current === processRunId) {
        activeFileRef.current = null;
        setPattern(null);
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

  function schedulePatternReprocess(nextLongestEdge: number) {
    clearPendingDimensionReprocess();

    pendingDimensionTimerRef.current = window.setTimeout(() => {
      pendingDimensionTimerRef.current = null;
      const file = activeFileRef.current;
      if (file) {
        void processFile(file, nextLongestEdge, { refreshPreview: false });
      }
    }, dimensionReprocessDelayMs);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file, longestEdge);
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
      await processFile(file, normalizedLongestEdge, { refreshPreview: false });
      return;
    }

    schedulePatternReprocess(normalizedLongestEdge);
  }

  async function onFileDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      await processFile(file, longestEdge);
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
      <input id="image-upload" className="sr-only" type="file" accept="image/png,image/jpeg" onChange={onFileChange} />
      <section className="border-b border-border bg-card shadow-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-primary">{t("appName")}</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            <div className="min-w-0 xl:ml-auto">
              <div className="no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto pb-1 xl:justify-end">
                <div className="flex shrink-0 items-center gap-2">
                  <label htmlFor="image-upload" className="inline-flex h-10 max-w-48 shrink-0 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-panel transition hover:opacity-95">
                    <ImageUp size={18} />
                    <span className="truncate">{t("uploadImage")}</span>
                  </label>
                </div>

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

          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs font-semibold text-muted-foreground" aria-live="polite">
            <span className="inline-flex min-w-0 items-center gap-2">
              <TableCellsSplit size={16} />
              {`${outputDimensions.width}x${outputDimensions.height}`}
            </span>
            {!pattern ? (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Palette size={16} />
                  {t("waitingForImage")}
                </span>
              </>
            ) : null}
            {fileName ? (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="max-w-full truncate sm:max-w-xs">{fileName}</span>
              </>
            ) : null}
            {isProcessing ? (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="inline-flex items-center gap-2 text-primary">
                  <Loader2 className="animate-spin" size={16} />
                  {t("processing")}
                </span>
              </>
            ) : null}
          </div>
          {errorKey ? (
            <p role="alert" className="rounded-md border border-destructive bg-background px-3 py-2 text-sm font-semibold text-destructive">
              {t(errorKey)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="px-3 py-4 sm:px-4 lg:px-6">
        {pattern ? (
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_260px] xl:items-start">
            <PatternLongestEdgeToolbar longestEdge={longestEdge} outputDimensions={outputDimensions} onLongestEdgeChange={onLongestEdgeChange} />
            <PatternGrid pattern={pattern} xLabels={xLabels} yLabels={yLabels} />
            {previewUrl ? <PatternSideRail fileName={fileName} pattern={pattern} previewUrl={previewUrl} /> : null}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <PatternLongestEdgeToolbar longestEdge={longestEdge} outputDimensions={outputDimensions} onLongestEdgeChange={onLongestEdgeChange} />
            <UploadWorkspace
              isDraggingFile={isDraggingFile}
              onDrop={onFileDrop}
              onDragOver={onFileDragOver}
              onDragLeave={onFileDragLeave}
              onKeyDown={onUploadKeyDown}
            />
          </div>
        )}
        {pattern ? <ColorSummary pattern={pattern} /> : <MardPaletteShowcase />}
      </section>
    </main>
  );
}

type SelectOption = {
  value: string;
  label: string;
  displayLabel?: string;
};

function PatternLongestEdgeToolbar({
  longestEdge,
  outputDimensions,
  onLongestEdgeChange,
}: {
  longestEdge: number;
  outputDimensions: { width: number; height: number };
  onLongestEdgeChange: (longestEdge: number, options?: LongestEdgeChangeOptions) => Promise<void>;
}) {
  const { t } = useI18n();

  return (
    <aside className="grid-size-toolbar border border-border bg-card p-3 shadow-panel" aria-label={t("gridSize")}>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <TableCellsSplit size={16} />
        <h2 className="text-sm font-semibold">{t("gridSize")}</h2>
      </div>
      <div className="mt-3 grid gap-2">
        {patternLongestEdgePresets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => void onLongestEdgeChange(preset, { reprocess: "immediate" })}
            className={`grid h-10 place-items-center rounded-md border px-3 font-mono text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
              longestEdge === preset
                ? "border-secondary bg-secondary text-secondary-foreground shadow-panel"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 border-t border-border pt-3">
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
          <span className="truncate text-xs font-semibold text-muted-foreground">{t("outputDimensions")}</span>
          <span className="font-mono text-xs font-bold text-foreground">{`${outputDimensions.width}x${outputDimensions.height}`}</span>
        </div>
        <PatternLongestEdgeControl
          label={t("patternLongestEdge")}
          decreaseLabel={t("decreasePatternLongestEdge")}
          increaseLabel={t("increasePatternLongestEdge")}
          value={longestEdge}
          onChange={(nextLongestEdge) => void onLongestEdgeChange(nextLongestEdge)}
        />
      </div>
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

function PreferenceSelect({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
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
  const selectedLabel = selectedOption?.displayLabel ?? selectedOption?.label ?? value;

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
        aria-label={label}
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
        className="preference-select-control inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="preference-select-menu fixed z-50 grid gap-1 rounded-md border border-border bg-card p-1 text-sm font-semibold text-foreground shadow-panel"
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
                  className={`flex min-h-9 items-center justify-between gap-3 rounded px-3 text-left transition ${
                    optionIndex === activeIndex || option.value === value ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.displayLabel ? <span className="font-mono text-xs text-muted-foreground">{option.displayLabel}</span> : null}
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
    <section className="upload-preview-placeholder border border-border bg-card p-3 shadow-panel">
      <label
        htmlFor="image-upload"
        role="button"
        tabIndex={0}
        aria-describedby="upload-dropzone-description"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onKeyDown={onKeyDown}
        className={`upload-preview-canvas grid min-h-[52vh] cursor-pointer place-items-center border px-4 py-8 text-center transition focus:outline-none focus:ring-2 focus:ring-ring sm:px-6 ${
          isDraggingFile ? "border-primary bg-muted shadow-panel" : "border-border bg-background"
        }`}
      >
        <span className="grid w-full max-w-4xl gap-5">
          <span className="upload-preview-frame mx-auto grid aspect-[4/3] w-full max-w-2xl place-items-center border border-dashed border-border bg-muted p-5">
            <span className="grid justify-items-center rounded-md border border-border bg-card px-6 py-5 shadow-panel">
              <span className="grid size-16 place-items-center rounded-md border border-border bg-background text-primary">
                <ImageUp size={34} />
              </span>
              <span className="mt-4 text-2xl font-semibold">{t("dropzoneTitle")}</span>
              <span id="upload-dropzone-description" className="mt-2 max-w-lg text-sm text-muted-foreground">
                {t("dropzoneBody")}
              </span>
            </span>
          </span>
          <span className="mx-auto inline-flex rounded-md border border-border bg-card px-3 py-2 text-xs font-bold uppercase text-muted-foreground shadow-panel">
            {t("dropzoneHint")}
          </span>
        </span>
      </label>
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

function PatternSideRail({ fileName, pattern, previewUrl }: { fileName: string; pattern: Pattern; previewUrl: string }) {
  return (
    <aside className="grid h-fit self-start gap-3">
      <ImagePreview fileName={fileName} previewUrl={previewUrl} />
      <PatternStatsCard pattern={pattern} />
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

function MardPaletteShowcase() {
  const { formatNumber, paletteLabel, t } = useI18n();

  return (
    <section className="mt-6 border border-border bg-card p-4 shadow-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("mardPaletteTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("mardPaletteSummary", {
            colors: formatNumber(mard221Palette.colorCount),
            families: formatNumber(mard221Palette.groups.length),
          })}
        </p>
      </div>
      <div className="mt-4 grid gap-4">
        {mardPaletteGroups.map((group) => (
          <section key={group.prefix} className="border border-border bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-mono text-sm font-bold text-foreground">
                {t("paletteFamilyTitle", { family: group.prefix, count: formatNumber(group.colors.length) })}
              </h3>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
              {group.colors.map((color) => (
                <div key={color.code} className="flex min-w-0 items-center gap-2 border border-border bg-card p-2">
                  <span className="size-7 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }} />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-bold">{color.code}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{paletteLabel(color)}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function PatternGrid({ pattern, xLabels, yLabels }: { pattern: Pattern; xLabels: number[]; yLabels: number[] }) {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  const columns = `${baseAxisWidth}px repeat(${pattern.width}, ${baseCellSize}px) ${baseAxisWidth}px`;
  const baseWidth = baseAxisWidth * 2 + pattern.width * baseCellSize;
  const baseHeight = (pattern.height + 2) * baseCellSize;
  const availableWidth = Math.max(1, viewportSize.width - gridViewportPadding);
  const availableHeight = Math.max(1, viewportSize.height - gridViewportPadding);
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
  const effectiveScale = fitScale * zoom;
  const scaledWidth = baseWidth * effectiveScale;
  const scaledHeight = baseHeight * effectiveScale;
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  const changeZoom = useCallback((direction: "in" | "out") => {
    setZoom((currentZoom) => clampZoom(currentZoom + (direction === "in" ? zoomStep : -zoomStep)));
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [pattern.width, pattern.height]);

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

  return (
    <section className="border border-border bg-card shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
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
      <div ref={viewportRef} className="h-[70vh] min-h-[320px] overflow-auto bg-card lg:h-[calc(100vh-240px)]">
        <div className="flex min-h-full min-w-full p-3">
          <div className="m-auto shrink-0" style={{ width: scaledWidth, height: scaledHeight }}>
            <div
              className="grid origin-top-left"
              style={{
                gridTemplateColumns: columns,
                width: baseWidth,
                height: baseHeight,
                transform: `scale(${effectiveScale})`,
              }}
            >
              <AxisCorner />
              {xLabels.map((label) => (
                <AxisCell key={`top-${label}`} label={label} major={label % 10 === 0 || label % 5 === 0} />
              ))}
              <AxisCorner />

              {yLabels.map((row) => (
                <Row key={row} row={row} pattern={pattern} />
              ))}

              <AxisCorner />
              {xLabels.map((label) => (
                <AxisCell key={`bottom-${label}`} label={label} major={label % 10 === 0 || label % 5 === 0} />
              ))}
              <AxisCorner />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ row, pattern }: { row: number; pattern: Pattern }) {
  const { paletteLabel, t } = useI18n();
  const start = (row - 1) * pattern.width;
  const rowCells = pattern.cells.slice(start, start + pattern.width);

  return (
    <>
      <AxisCell label={row} major={row % 10 === 0 || row % 5 === 0} />
      {rowCells.map((cell) => {
        const majorX = cell.x % 10 === 0;
        const minorX = cell.x % 5 === 0;
        const majorY = cell.y % 10 === 0;
        const minorY = cell.y % 5 === 0;

        return (
          <div
            key={`${cell.x}-${cell.y}`}
            className={[
              "grid h-[22px] w-[22px] place-items-center border-b border-r border-black/40 font-mono text-[9px] font-bold leading-none",
              majorX ? "border-r-[3px] border-r-black" : "",
              minorX && !majorX ? "border-r-2 border-r-black/70 border-r-dashed" : "",
              majorY ? "border-b-[3px] border-b-black" : "",
              minorY && !majorY ? "border-b-2 border-b-black/70 border-b-dashed" : "",
            ].join(" ")}
            style={{
              backgroundColor: `rgb(${cell.color.r} ${cell.color.g} ${cell.color.b})`,
              color: readableTextColor(cell.color),
            }}
            title={t("cellTitle", { x: cell.x, y: cell.y, code: cell.color.code, label: paletteLabel(cell.color) })}
          >
            {cell.color.code}
          </div>
        );
      })}
      <AxisCell label={row} major={row % 10 === 0 || row % 5 === 0} />
    </>
  );
}

function AxisCell({ label, major }: { label: number; major: boolean }) {
  return (
    <div
      className={`grid h-[22px] w-full place-items-center border-b border-r border-border bg-muted px-1 font-mono text-[10px] font-bold ${
        major ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

function AxisCorner() {
  return <div className="h-[22px] w-full border-b border-r border-border bg-foreground" />;
}

function ColorSummary({ pattern }: { pattern: Pattern }) {
  const { formatNumber, paletteLabel, t } = useI18n();

  return (
    <section className="mt-6 border border-border bg-card p-4 shadow-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("summaryTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("patternSummary", {
            width: pattern.width,
            height: pattern.height,
            colors: formatNumber(pattern.usage.length),
            total: formatNumber(pattern.totalBeads),
          })}
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pattern.usage.map(({ color, count }) => (
          <div key={color.code} className="flex items-center gap-3 border border-border bg-background p-2">
            <span
              className="h-8 w-8 shrink-0 border border-black/30"
              style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold">{color.code}</p>
              <p className="truncate text-xs text-muted-foreground">{paletteLabel(color)}</p>
            </div>
            <p className="font-mono text-sm font-bold">{formatNumber(count)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
