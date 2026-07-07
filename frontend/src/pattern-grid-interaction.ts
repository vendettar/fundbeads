import type { BeadColor } from "./palette";
import { createPatternFromCells, type Pattern } from "./pattern-model";

export const patternGridZoomMin = 0.5;
export const patternGridZoomMax = 3;
export const patternGridZoomStep = 0.1;

export type PatternGridNavigationKey = "ArrowRight" | "ArrowLeft" | "ArrowDown" | "ArrowUp" | "Home" | "End";

export type PatternGridPanMetrics = {
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
};

export type PatternGridPanStart = {
  clientX: number;
  clientY: number;
  scrollLeft: number;
  scrollTop: number;
};

export type PatternGridPanPoint = {
  clientX: number;
  clientY: number;
};

export type PatternGridColorCellIndexEntry<T> = {
  colorCode: string | null | undefined;
  item: T;
};

export type PatternGridColorFocusClassChanges<T> = {
  addItems: readonly T[];
  removeItems: readonly T[];
  isActive: boolean;
};

export type PatternGridColorFocusClassChangeOptions = {
  force?: boolean;
};

export type PatternGridColorFocusEditedCell = {
  cellIndex: number;
  colorCode: string | null | undefined;
};

export type PatternGridColorFocusEditedAwayMarker = { type: "erase" } | { type: "paint"; colorCode: string };
export type PatternGridPersistentEditTool = "view" | "paint" | "pick" | "erase";
export type PatternGridTransientEditTool = PatternGridPersistentEditTool | "replace";

export type PatternGridColorFocusEditedAwayMarkerChanges = {
  addMarkers: readonly {
    cellIndex: number;
    marker: PatternGridColorFocusEditedAwayMarker;
  }[];
  removeIndexes: readonly number[];
};

export function clampPatternGridZoom(zoom: number) {
  return Math.min(patternGridZoomMax, Math.max(patternGridZoomMin, Number(zoom.toFixed(2))));
}

export function buildPatternGridColorCellIndex<T>(entries: readonly PatternGridColorCellIndexEntry<T>[]): Map<string, T[]> {
  const colorCellIndex = new Map<string, T[]>();

  for (const entry of entries) {
    if (!entry.colorCode) {
      continue;
    }

    const colorItems = colorCellIndex.get(entry.colorCode) ?? [];
    colorItems.push(entry.item);
    colorCellIndex.set(entry.colorCode, colorItems);
  }

  return colorCellIndex;
}

export function patternGridColorFocusClassChanges<T>(
  previousColorCode: string | null,
  nextColorCode: string | null,
  colorCellIndex: ReadonlyMap<string, readonly T[]>,
  options: PatternGridColorFocusClassChangeOptions = {},
): PatternGridColorFocusClassChanges<T> {
  if (previousColorCode === nextColorCode && !options.force) {
    return { addItems: [], removeItems: [], isActive: nextColorCode !== null };
  }

  return {
    addItems: nextColorCode ? (colorCellIndex.get(nextColorCode) ?? []) : [],
    removeItems: previousColorCode && previousColorCode !== nextColorCode ? (colorCellIndex.get(previousColorCode) ?? []) : [],
    isActive: nextColorCode !== null,
  };
}

export function patternGridCellCanEdit(cellColorCode: string | null | undefined, focusedColorCode: string | null | undefined) {
  return !focusedColorCode || cellColorCode === focusedColorCode;
}

export function patternGridReplaceReturnTool(currentTool: PatternGridTransientEditTool, fallbackTool: PatternGridPersistentEditTool): PatternGridPersistentEditTool {
  return currentTool === "replace" ? fallbackTool : currentTool;
}

export function patternGridToolAfterReplaceClose(currentTool: PatternGridTransientEditTool, returnTool: PatternGridPersistentEditTool): PatternGridTransientEditTool {
  return currentTool === "replace" ? returnTool : currentTool;
}

export function patternGridColorFocusEditedAwayMarkerChanges(
  editedCells: readonly PatternGridColorFocusEditedCell[],
  focusedColorCode: string | null | undefined,
  nextColorCode: string | null | undefined,
): PatternGridColorFocusEditedAwayMarkerChanges {
  if (!focusedColorCode) {
    return { addMarkers: [], removeIndexes: [] };
  }

  const changedFocusedCellIndexes = editedCells.filter((cell) => cell.colorCode === focusedColorCode).map((cell) => cell.cellIndex);
  if (nextColorCode === focusedColorCode) {
    return { addMarkers: [], removeIndexes: changedFocusedCellIndexes };
  }

  return {
    addMarkers: changedFocusedCellIndexes.map((cellIndex) => ({
      cellIndex,
      marker: nextColorCode ? { type: "paint", colorCode: nextColorCode } : { type: "erase" },
    })),
    removeIndexes: [],
  };
}

export function previewPatternGridStroke(pattern: Pattern, cellIndexes: readonly number[], tool: "paint" | "erase", paintColor: BeadColor): Pattern {
  const previewIndexes = new Set(cellIndexes.filter((cellIndex) => Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < pattern.cells.length));
  if (previewIndexes.size === 0) {
    return pattern;
  }

  let hasChangedCell = false;
  const previewCells = pattern.cells.map((cell, cellIndex) => {
    if (!previewIndexes.has(cellIndex)) {
      return cell;
    }

    const previewColor = tool === "paint" ? paintColor : null;
    if (cell.color?.code === previewColor?.code) {
      return cell;
    }

    hasChangedCell = true;
    return { ...cell, color: previewColor };
  });

  return hasChangedCell ? createPatternFromCells(previewCells, { width: pattern.width, height: pattern.height }) : pattern;
}

export function canPanPatternGrid(metrics: PatternGridPanMetrics) {
  if (!Object.values(metrics).every((value) => Number.isFinite(value))) {
    return false;
  }
  return metrics.scrollWidth > metrics.clientWidth || metrics.scrollHeight > metrics.clientHeight;
}

export function nextPatternGridPanScroll(start: PatternGridPanStart, point: PatternGridPanPoint, metrics: PatternGridPanMetrics) {
  const maxScrollLeft = Math.max(0, metrics.scrollWidth - metrics.clientWidth);
  const maxScrollTop = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  const scrollLeft = clampScrollPosition(start.scrollLeft + start.clientX - point.clientX, maxScrollLeft);
  const scrollTop = clampScrollPosition(start.scrollTop + start.clientY - point.clientY, maxScrollTop);

  return { scrollLeft, scrollTop };
}

export function collectStrokeCellIndexes(previousCellIndex: number, cellIndex: number, patternWidth: number) {
  if (
    !Number.isInteger(previousCellIndex) ||
    !Number.isInteger(cellIndex) ||
    !Number.isInteger(patternWidth) ||
    previousCellIndex < 0 ||
    cellIndex < 0 ||
    patternWidth <= 0
  ) {
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

export function nextKeyboardCellIndex(currentCellIndex: number, key: string, patternWidth: number, totalCells: number): number | null {
  if (!Number.isInteger(currentCellIndex) || !Number.isInteger(patternWidth) || !Number.isInteger(totalCells) || patternWidth <= 0 || totalCells <= 0) {
    return null;
  }

  const currentX = currentCellIndex % patternWidth;
  const currentY = Math.floor(currentCellIndex / patternWidth);

  if (key === "ArrowRight") {
    return currentY * patternWidth + Math.min(patternWidth - 1, currentX + 1);
  }

  if (key === "ArrowLeft") {
    return currentY * patternWidth + Math.max(0, currentX - 1);
  }

  if (key === "ArrowDown") {
    return Math.min(totalCells - 1, currentCellIndex + patternWidth);
  }

  if (key === "ArrowUp") {
    return Math.max(0, currentCellIndex - patternWidth);
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return totalCells - 1;
  }

  return null;
}

function clampScrollPosition(value: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(max, Math.max(0, value));
}
