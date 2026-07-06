import type { PatternDimensions } from "./pattern";

export type PatternPreviewOption = "showGrid" | "showCodes" | "showAxes";
export type PatternPreviewOptions = Record<PatternPreviewOption, boolean>;
export type PatternGuideLevel = "major" | "minor" | "base";

export type PatternGridGeometryOptions = {
  showAxes: boolean;
  cellSize: number;
  axisWidth: number;
  axisHeight: number;
};

export type PatternGridGeometry = {
  cellSize: number;
  axisWidth: number;
  axisHeight: number;
  gridWidth: number;
  gridHeight: number;
  totalWidth: number;
  totalHeight: number;
  originX: number;
  originY: number;
  columns: string;
};

export const defaultPatternPreviewOptions: PatternPreviewOptions = {
  showGrid: true,
  showCodes: true,
  showAxes: true,
};

export function axisLabels(length: number): number[] {
  return Array.from({ length }, (_, index) => index + 1);
}

export function patternGuideLevel(position: number): PatternGuideLevel {
  if (position > 0 && position % 10 === 0) {
    return "major";
  }

  if (position > 0 && position % 5 === 0) {
    return "minor";
  }

  return "base";
}

export function isPatternAxisLabelEmphasized(label: number): boolean {
  return patternGuideLevel(label) !== "base";
}

export function patternGridGeometry(dimensions: PatternDimensions, options: PatternGridGeometryOptions): PatternGridGeometry {
  const cellSize = Math.max(1, Math.round(options.cellSize));
  const axisWidth = options.showAxes ? Math.max(0, Math.round(options.axisWidth)) : 0;
  const axisHeight = options.showAxes ? Math.max(0, Math.round(options.axisHeight)) : 0;
  const gridWidth = dimensions.width * cellSize;
  const gridHeight = dimensions.height * cellSize;

  return {
    cellSize,
    axisWidth,
    axisHeight,
    gridWidth,
    gridHeight,
    totalWidth: gridWidth + axisWidth * 2,
    totalHeight: gridHeight + axisHeight * 2,
    originX: axisWidth,
    originY: axisHeight,
    columns: options.showAxes ? `${axisWidth}px repeat(${dimensions.width}, ${cellSize}px) ${axisWidth}px` : `repeat(${dimensions.width}, ${cellSize}px)`,
  };
}
