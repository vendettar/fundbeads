export const patternGridZoomMin = 0.5;
export const patternGridZoomMax = 3;
export const patternGridZoomStep = 0.1;

export type PatternGridNavigationKey = "ArrowRight" | "ArrowLeft" | "ArrowDown" | "ArrowUp" | "Home" | "End";

export function clampPatternGridZoom(zoom: number) {
  return Math.min(patternGridZoomMax, Math.max(patternGridZoomMin, Number(zoom.toFixed(2))));
}

export function patternGridFocusRules(colorCodes: string[]) {
  return colorCodes
    .map((colorCode) => {
      const escapedColorCode = cssAttributeString(colorCode);
      return `.pattern-grid-board[data-focused-color-code="${escapedColorCode}"] .pattern-cell[data-color-code]:not([data-color-code="${escapedColorCode}"]) { background-color: var(--beads-background) !important; color: transparent !important; }`;
    })
    .join("\n");
}

export function cssAttributeString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\A ");
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
