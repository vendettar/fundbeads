import { ZoomIn, ZoomOut } from "lucide-react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "./i18n";
import { mard221Palette, mardPalette } from "./palette";
import { PatternEditControls } from "./pattern-edit-toolbar";
import { exportPatternPdf, exportPatternPng } from "./pattern-export";
import { PatternGridBoard } from "./pattern-grid-board";
import { defaultPatternPreviewOptions, patternGridGeometry, type PatternPreviewOption } from "./pattern-grid-geometry";
import { getPatternReplaceColorGroups, getPatternReplaceSourceColors, getPatternReplaceTargetColors, getValidPatternReplaceTargetCode } from "./pattern-replace-options";
import {
  canPanPatternGrid,
  clampPatternGridZoom,
  collectStrokeCellIndexes,
  nextPatternGridPanScroll,
  nextKeyboardCellIndex,
  patternGridCellCanEdit,
  patternGridColorFocusEditedAwayMarkerChanges,
  patternGridReplaceReturnTool,
  patternGridToolAfterReplaceClose,
  previewPatternGridStroke,
  patternGridZoomMax,
  patternGridZoomMin,
  patternGridZoomStep,
  type PatternGridColorFocusEditedAwayMarker,
  type PatternGridPersistentEditTool,
  type PatternGridPanStart,
} from "./pattern-grid-interaction";
import { PatternPreviewToolbar, type PatternExportFormat } from "./pattern-preview-toolbar";
import {
  erasePatternCells,
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
import { readableTextColor, type Pattern } from "./pattern";

const baseCellSize = 22;
const baseAxisWidth = 38;
const gridViewportPadding = 24;
const mardPaletteByCode = new Map(mardPalette.map((color) => [color.code, color]));

type PatternEditStateUpdater = (currentState: PatternEditState) => PatternEditState;
type PatternEditStroke = {
  pointerId: number;
  tool: "paint" | "erase";
  cellIndexes: Set<number>;
  lastCellIndex: number;
};
type PatternEditStrokePreview = {
  tool: "paint" | "erase";
  cellIndexes: ReadonlySet<number>;
};
type PatternGridPan = PatternGridPanStart & {
  pointerId: number;
};
type PatternGridColorFocusEditedAwayCellMarker = { type: "erase" } | { type: "paint"; colorCode: string; colorCss: string; colorFgCss: string };

type PatternGridProps = {
  pattern: Pattern;
  editState: PatternEditState;
  onEditStateChange: (updater: PatternEditStateUpdater) => void;
  xLabels: number[];
  gridRef: RefObject<HTMLDivElement | null>;
  pinnedColorCode: string | null;
  onGridDisplayOptionsChange: () => void;
};

export function PatternGrid({ pattern, editState, onEditStateChange, xLabels, gridRef, pinnedColorCode, onGridDisplayOptionsChange }: PatternGridProps) {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<PatternEditStroke | null>(null);
  const viewPanRef = useRef<PatternGridPan | null>(null);
  const keyboardCellIndexRef = useRef(0);
  const gridCellIdPrefix = useId();
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [keyboardCellIndex, setKeyboardCellIndex] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isReplacePanelOpen, setIsReplacePanelOpen] = useState(false);
  const [replaceReturnTool, setReplaceReturnTool] = useState<PatternGridPersistentEditTool>("view");
  const [replaceSourceCode, setReplaceSourceCode] = useState(editState.activeColorCode);
  const [replaceTargetCode, setReplaceTargetCode] = useState(editState.activeColorCode);
  const [replaceStatusKey, setReplaceStatusKey] = useState<"patternEditReplaceNoSource" | null>(null);
  const [previewOptions, setPreviewOptions] = useState(defaultPatternPreviewOptions);
  const [exportFormat, setExportFormat] = useState<PatternExportFormat | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  const [strokePreview, setStrokePreview] = useState<PatternEditStrokePreview | null>(null);
  const [colorFocusEditedAwayCellMarkers, setColorFocusEditedAwayCellMarkers] = useState<ReadonlyMap<number, PatternGridColorFocusEditedAwayCellMarker>>(new Map());
  const replaceSourceColors = useMemo(() => getPatternReplaceSourceColors(pattern.usage, pinnedColorCode), [pattern.usage, pinnedColorCode]);
  const validReplaceSourceCodes = useMemo(() => new Set(replaceSourceColors.map((color) => color.code)), [replaceSourceColors]);
  const selectedReplaceSourceCode = validReplaceSourceCodes.has(replaceSourceCode) ? replaceSourceCode : (replaceSourceColors[0]?.code ?? "");
  const replaceTargetColors = useMemo(() => getPatternReplaceTargetColors(mardPalette, selectedReplaceSourceCode), [selectedReplaceSourceCode]);
  const replaceSourceColorGroups = useMemo(() => getPatternReplaceColorGroups(replaceSourceColors, mard221Palette.groups), [replaceSourceColors]);
  const replaceTargetColorGroups = useMemo(() => getPatternReplaceColorGroups(replaceTargetColors, mard221Palette.groups), [replaceTargetColors]);
  const geometry = useMemo(
    () =>
      patternGridGeometry(pattern, {
        showAxes: previewOptions.showAxes,
        cellSize: baseCellSize,
        axisWidth: baseAxisWidth,
        axisHeight: baseCellSize,
      }),
    [pattern, previewOptions.showAxes],
  );
  const baseWidth = geometry.totalWidth;
  const baseHeight = geometry.totalHeight;
  const availableWidth = Math.max(1, viewportSize.width - gridViewportPadding);
  const availableHeight = Math.max(1, viewportSize.height - gridViewportPadding);
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
  const effectiveScale = fitScale * zoom;
  const scaledWidth = baseWidth * effectiveScale;
  const scaledHeight = baseHeight * effectiveScale;
  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const activeColor = mardPaletteByCode.get(editState.activeColorCode) ?? mardPalette[0];
  const replaceSourceColor = replaceSourceColors.find((color) => color.code === selectedReplaceSourceCode);
  const replaceTargetColor = mardPaletteByCode.get(replaceTargetCode);
  const strokePreviewPattern = useMemo(
    () => (strokePreview ? previewPatternGridStroke(pattern, [...strokePreview.cellIndexes], strokePreview.tool, activeColor) : pattern),
    [activeColor, pattern, strokePreview],
  );
  const canUndo = editState.undoStack.length > 0;
  const canRedo = editState.redoStack.length > 0;
  const hasManualEdits = Object.keys(editState.overrides).length > 0;
  const canApplyReplace = validReplaceSourceCodes.has(selectedReplaceSourceCode) && replaceTargetColors.some((color) => color.code === replaceTargetCode);
  const activeGridCellId = `${gridCellIdPrefix}-cell-${keyboardCellIndex}`;

  const setKeyboardFocusedCell = useCallback(
    (nextCellIndex: number, { scroll = false }: { scroll?: boolean } = {}) => {
      const clampedCellIndex = Math.min(Math.max(0, nextCellIndex), pattern.cells.length - 1);
      const previousCellIndex = keyboardCellIndexRef.current;
      const grid = gridRef.current;
      grid?.querySelector<HTMLElement>(`[data-cell-index="${previousCellIndex}"]`)?.removeAttribute("data-keyboard-active");

      keyboardCellIndexRef.current = clampedCellIndex;
      setKeyboardCellIndex(clampedCellIndex);

      const activeCell = grid?.querySelector<HTMLElement>(`[data-cell-index="${clampedCellIndex}"]`);
      activeCell?.setAttribute("data-keyboard-active", "true");
      if (scroll) {
        activeCell?.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    },
    [gridRef, pattern.cells.length],
  );

  const changeZoom = useCallback((direction: "in" | "out") => {
    setZoom((currentZoom) => clampPatternGridZoom(currentZoom + (direction === "in" ? patternGridZoomStep : -patternGridZoomStep)));
  }, []);

  const togglePreviewOption = useCallback((option: PatternPreviewOption) => {
    setPreviewOptions((currentOptions) => ({
      ...currentOptions,
      [option]: !currentOptions[option],
    }));
  }, []);

  const exportPattern = useCallback(
    async (format: PatternExportFormat) => {
      if (exportFormat) {
        return;
      }

      setExportFailed(false);
      setExportFormat(format);
      try {
        if (format === "png") {
          await exportPatternPng(pattern, previewOptions);
        } else {
          await exportPatternPdf(pattern, previewOptions);
        }
      } catch (error) {
        console.error(error);
        setExportFailed(true);
      } finally {
        setExportFormat(null);
      }
    },
    [exportFormat, pattern, previewOptions],
  );

  const updateEditState = useCallback(
    (updater: PatternEditStateUpdater) => {
      setReplaceStatusKey(null);
      onEditStateChange(updater);
    },
    [onEditStateChange],
  );

  useEffect(() => {
    setZoom(1);
    setKeyboardFocusedCell(0);
  }, [pattern.width, pattern.height, setKeyboardFocusedCell]);

  useEffect(() => {
    return () => {
      strokeRef.current = null;
      viewPanRef.current = null;
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
      setViewportSize((currentSize) => {
        const nextSize = { width: viewport.clientWidth, height: viewport.clientHeight };
        return currentSize.width === nextSize.width && currentSize.height === nextSize.height ? currentSize : nextSize;
      });
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
      setZoom((currentZoom) => clampPatternGridZoom(currentZoom + (event.deltaY < 0 ? patternGridZoomStep : -patternGridZoomStep)));
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });

    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const defaultSourceCode = validReplaceSourceCodes.has(editState.activeColorCode) ? editState.activeColorCode : replaceSourceColors[0]?.code;
    setReplaceSourceCode((currentSourceCode) => (validReplaceSourceCodes.has(currentSourceCode) ? currentSourceCode : (defaultSourceCode ?? "")));
  }, [editState.activeColorCode, replaceSourceColors, validReplaceSourceCodes]);

  useEffect(() => {
    setReplaceTargetCode((currentTargetCode) => getValidPatternReplaceTargetCode(mardPalette, selectedReplaceSourceCode, currentTargetCode));
  }, [selectedReplaceSourceCode]);

  useLayoutEffect(() => {
    onGridDisplayOptionsChange();
  }, [onGridDisplayOptionsChange, previewOptions.showAxes, previewOptions.showCodes, previewOptions.showGrid]);

  useEffect(() => {
    setColorFocusEditedAwayCellMarkers(new Map());
  }, [pinnedColorCode]);

  useEffect(() => {
    if (!pinnedColorCode) {
      return;
    }

    setColorFocusEditedAwayCellMarkers((currentMarkers) => {
      const nextMarkers = new Map([...currentMarkers].filter(([cellIndex]) => pattern.cells[cellIndex]?.color?.code !== pinnedColorCode));
      return nextMarkers.size === currentMarkers.size ? currentMarkers : nextMarkers;
    });
  }, [pattern, pinnedColorCode]);

  function closeReplacePanel() {
    setIsReplacePanelOpen(false);
    updateEditState((currentState) => setPatternEditTool(currentState, patternGridToolAfterReplaceClose(currentState.tool, replaceReturnTool)));
  }

  function switchTool(tool: PatternEditTool) {
    if (tool === "replace") {
      if (isReplacePanelOpen) {
        closeReplacePanel();
        return;
      }

      const nextReturnTool = patternGridReplaceReturnTool(editState.tool, replaceReturnTool);
      setReplaceReturnTool(nextReturnTool);
      updateEditState((currentState) => setPatternEditTool(currentState, "replace"));
      setIsReplacePanelOpen(true);
      return;
    }
    updateEditState((currentState) => setPatternEditTool(currentState, tool));
    setIsReplacePanelOpen(false);
  }

  function selectActiveColor(colorCode: string) {
    updateEditState((currentState) => setPatternEditActiveColor(setPatternEditTool(currentState, "paint"), colorCode, mardPalette));
    setIsReplacePanelOpen(false);
    setReplaceTargetCode(colorCode);
    if (validReplaceSourceCodes.has(colorCode)) {
      setReplaceSourceCode(colorCode);
    }
  }

  function applyReplace() {
    if (!canApplyReplace || !validReplaceSourceCodes.has(selectedReplaceSourceCode)) {
      setReplaceStatusKey("patternEditReplaceNoSource");
      return;
    }

    updateEditState((currentState) => replacePatternColor(currentState, selectedReplaceSourceCode, replaceTargetCode, mardPalette));
    setReplaceStatusKey(null);
  }

  function applyKeyboardCellEdit(cellIndex: number) {
    if (editState.tool === "view" || editState.tool === "replace" || !canEditCellIndex(cellIndex)) {
      return;
    }

    if (editState.tool === "pick") {
      const pickedColorCode = pattern.cells[cellIndex]?.color?.code;
      if (pickedColorCode) {
        updateEditState((currentState) => setPatternEditTool(setPatternEditActiveColor(currentState, pickedColorCode, mardPalette), "paint"));
        setIsReplacePanelOpen(false);
        setReplaceSourceCode(pickedColorCode);
        setReplaceTargetCode(pickedColorCode);
      }
      return;
    }

    markColorFocusEditedAwayCells([cellIndex], editState.tool === "paint" ? editState.activeColorCode : null);
    updateEditState((currentState) =>
      editState.tool === "paint"
        ? paintPatternCells(currentState, [cellIndex], currentState.activeColorCode, mardPalette)
        : erasePatternCells(currentState, [cellIndex]),
    );
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

  function canEditCellIndex(cellIndex: number) {
    return patternGridCellCanEdit(pattern.cells[cellIndex]?.color?.code, pinnedColorCode);
  }

  function markColorFocusEditedAwayCells(cellIndexes: number[], nextColorCode: string | null) {
    const markerChanges = patternGridColorFocusEditedAwayMarkerChanges(
      cellIndexes.map((cellIndex) => ({ cellIndex, colorCode: pattern.cells[cellIndex]?.color?.code })),
      pinnedColorCode,
      nextColorCode,
    );

    if (markerChanges.addMarkers.length === 0 && markerChanges.removeIndexes.length === 0) {
      return;
    }

    setColorFocusEditedAwayCellMarkers((currentMarkers) => {
      const nextMarkers = new Map(currentMarkers);
      markerChanges.removeIndexes.forEach((cellIndex) => nextMarkers.delete(cellIndex));
      markerChanges.addMarkers.forEach(({ cellIndex, marker }) => {
        const displayMarker = getColorFocusEditedAwayDisplayMarker(marker);
        if (displayMarker) {
          nextMarkers.set(cellIndex, displayMarker);
        } else {
          nextMarkers.delete(cellIndex);
        }
      });
      return nextMarkers;
    });
  }

  function getColorFocusEditedAwayDisplayMarker(marker: PatternGridColorFocusEditedAwayMarker): PatternGridColorFocusEditedAwayCellMarker | null {
    if (marker.type === "erase") {
      return marker;
    }

    const color = mardPaletteByCode.get(marker.colorCode);
    return color ? { ...marker, colorCss: `rgb(${color.r} ${color.g} ${color.b})`, colorFgCss: readableTextColor(color) } : null;
  }

  function getViewportPanMetrics(viewport: HTMLDivElement) {
    return {
      scrollWidth: viewport.scrollWidth,
      clientWidth: viewport.clientWidth,
      scrollHeight: viewport.scrollHeight,
      clientHeight: viewport.clientHeight,
    };
  }

  function beginViewPan(event: ReactPointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!viewport || !canPanPatternGrid(getViewportPanMetrics(viewport))) {
      return false;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    viewPanRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    setIsPanning(true);
    return true;
  }

  function updateViewPan(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = viewPanRef.current;
    const viewport = viewportRef.current;
    if (!pan || pan.pointerId !== event.pointerId || !viewport) {
      return false;
    }

    event.preventDefault();
    const nextScroll = nextPatternGridPanScroll(pan, event, getViewportPanMetrics(viewport));
    viewport.scrollLeft = nextScroll.scrollLeft;
    viewport.scrollTop = nextScroll.scrollTop;
    return true;
  }

  function clearViewPan(pointerId: number) {
    if (viewPanRef.current?.pointerId === pointerId) {
      viewPanRef.current = null;
      setIsPanning(false);
    }
  }

  function addStrokeCell(event: ReactPointerEvent<HTMLElement>) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) {
      return;
    }
    const cellIndex = getCellIndexFromPointerEvent(event);
    if (cellIndex !== null && canEditCellIndex(cellIndex)) {
      const previousCellIndex = stroke.lastCellIndex;
      const nextCellIndexes = collectStrokeCellIndexes(previousCellIndex, cellIndex, pattern.width).filter((nextCellIndex) => canEditCellIndex(nextCellIndex));
      let addedPreviewCell = false;
      nextCellIndexes.forEach((nextCellIndex) => {
        if (!stroke.cellIndexes.has(nextCellIndex)) {
          addedPreviewCell = true;
          stroke.cellIndexes.add(nextCellIndex);
        }
      });
      stroke.lastCellIndex = cellIndex;
      if (addedPreviewCell) {
        setStrokePreview({ tool: stroke.tool, cellIndexes: new Set(stroke.cellIndexes) });
      }
    }
  }

  function commitStroke(pointerId: number) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== pointerId) {
      return;
    }
    strokeRef.current = null;
    setStrokePreview(null);

    const cellIndexes = [...stroke.cellIndexes];
    if (cellIndexes.length === 0) {
      return;
    }

    markColorFocusEditedAwayCells(cellIndexes, stroke.tool === "paint" ? editState.activeColorCode : null);
    updateEditState((currentState) =>
      stroke.tool === "paint"
        ? paintPatternCells(currentState, cellIndexes, currentState.activeColorCode, mardPalette)
        : erasePatternCells(currentState, cellIndexes),
    );
  }

  function clearStroke(pointerId: number) {
    if (strokeRef.current?.pointerId === pointerId) {
      strokeRef.current = null;
      setStrokePreview(null);
    }
  }

  function releaseBoardPointerCapture(board: HTMLDivElement, pointerId: number) {
    if (board.hasPointerCapture(pointerId)) {
      board.releasePointerCapture(pointerId);
    }
  }

  function onBoardPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    if (editState.tool === "view") {
      event.preventDefault();
      const cellIndex = getCellIndexFromPointerEvent(event);
      if (cellIndex !== null) {
        setKeyboardFocusedCell(cellIndex);
      }
      beginViewPan(event);
      return;
    }

    const cellIndex = getCellIndexFromPointerEvent(event);
    if (cellIndex === null) {
      return;
    }

    if ((editState.tool === "paint" || editState.tool === "erase" || editState.tool === "pick") && !canEditCellIndex(cellIndex)) {
      return;
    }

    event.preventDefault();
    setKeyboardFocusedCell(cellIndex);

    if (editState.tool === "replace") {
      return;
    }

    if (editState.tool === "pick") {
      const pickedColorCode = pattern.cells[cellIndex]?.color?.code;
      if (pickedColorCode) {
        updateEditState((currentState) => setPatternEditTool(setPatternEditActiveColor(currentState, pickedColorCode, mardPalette), "paint"));
        setIsReplacePanelOpen(false);
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
    setStrokePreview({ tool: editState.tool, cellIndexes: new Set([cellIndex]) });
  }

  function onBoardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (updateViewPan(event)) {
      return;
    }
    addStrokeCell(event);
  }

  function onBoardPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    commitStroke(event.pointerId);
    clearViewPan(event.pointerId);
    releaseBoardPointerCapture(event.currentTarget, event.pointerId);
  }

  function onBoardPointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    if (viewPanRef.current?.pointerId === event.pointerId) {
      return;
    }
    commitStroke(event.pointerId);
    releaseBoardPointerCapture(event.currentTarget, event.pointerId);
  }

  function onBoardPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    clearStroke(event.pointerId);
    clearViewPan(event.pointerId);
    releaseBoardPointerCapture(event.currentTarget, event.pointerId);
  }

  function onBoardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentCellIndex = keyboardCellIndexRef.current;
    const nextCellIndex = nextKeyboardCellIndex(currentCellIndex, event.key, pattern.width, pattern.cells.length);
    if (nextCellIndex !== null) {
      event.preventDefault();
      setKeyboardFocusedCell(nextCellIndex, { scroll: true });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      applyKeyboardCellEdit(currentCellIndex);
    }
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
              disabled={zoom <= patternGridZoomMin}
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
              disabled={zoom >= patternGridZoomMax}
              className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("zoomIn")}
              title={t("zoomIn")}
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        <PatternEditControls
          editState={editState}
          activeColor={activeColor}
          sourceUsage={pattern.usage}
          replaceSourceColorGroups={replaceSourceColorGroups}
          replaceTargetColorGroups={replaceTargetColorGroups}
          canUndo={canUndo}
          canRedo={canRedo}
          hasManualEdits={hasManualEdits}
          isReplacePanelOpen={isReplacePanelOpen}
          replaceSourceCode={selectedReplaceSourceCode}
          replaceTargetCode={replaceTargetCode}
          replaceSourceColor={replaceSourceColor}
          replaceTargetColor={replaceTargetColor}
          replaceStatusKey={replaceStatusKey}
          canApplyReplace={canApplyReplace}
          onToolSelect={switchTool}
          onActiveColorSelect={selectActiveColor}
          onUndo={() => updateEditState(undoPatternEdit)}
          onRedo={() => updateEditState(redoPatternEdit)}
          onReset={() => updateEditState(resetPatternEdits)}
          onReplaceSourceChange={setReplaceSourceCode}
          onReplaceTargetChange={setReplaceTargetCode}
          onApplyReplace={applyReplace}
          onReplacePanelClose={closeReplacePanel}
        />
      </div>
      <PatternGridBoard
        pattern={strokePreviewPattern}
        previewOptions={previewOptions}
        xLabels={xLabels}
        gridRef={gridRef}
        viewportRef={viewportRef}
        cellIdPrefix={gridCellIdPrefix}
        activeCellId={activeGridCellId}
        geometry={geometry}
        scaledWidth={scaledWidth}
        scaledHeight={scaledHeight}
        effectiveScale={effectiveScale}
        editTool={editState.tool}
        isPanning={isPanning}
        colorFocusEditedAwayCellMarkers={colorFocusEditedAwayCellMarkers}
        onPointerDown={onBoardPointerDown}
        onPointerMove={onBoardPointerMove}
        onPointerUp={onBoardPointerUp}
        onPointerLeave={onBoardPointerLeave}
        onPointerCancel={onBoardPointerCancel}
        onFocus={() => setKeyboardFocusedCell(keyboardCellIndexRef.current)}
        onKeyDown={onBoardKeyDown}
      />
      <div className="border-t border-border px-3 py-2">
        <PatternPreviewToolbar previewOptions={previewOptions} exportFormat={exportFormat} exportFailed={exportFailed} onPreviewOptionToggle={togglePreviewOption} onExportPattern={exportPattern} />
      </div>
    </section>
  );
}
