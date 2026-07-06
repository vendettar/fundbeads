import { normalizeColorDistanceMode, type ColorDistanceMode } from "./color-matching";
import { ditherPixelsToPalette, normalizeDitherMode, type DitherMode } from "./dither";
import { applyMaxColorCount, defaultMaxColorCount, normalizeMaxColorCount } from "./max-color";
import type { BeadColor, Rgb } from "./palette";
import { mardPalette } from "./palette";
import { normalizePatternOutputDimensions } from "./pattern-dimensions";
import { createPatternFromCells, type Pattern, type PatternCell, type PatternDimensions } from "./pattern-model";

export const defaultSmoothingLevel = 0;
export const smoothingLevelMin = 0;
export const smoothingLevelMax = 3;

export type PatternProcessingOptions = {
  colorDistanceMode?: ColorDistanceMode;
  ditherMode?: DitherMode;
  smoothingLevel?: number;
  maxColorCount?: number;
};

export function normalizeSmoothingLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultSmoothingLevel;
  }

  return Math.min(smoothingLevelMax, Math.max(smoothingLevelMin, Math.round(value)));
}

export function cellsToPattern(cells: PatternCell[], dimensions: PatternDimensions): Pattern {
  const { width, height } = normalizePatternOutputDimensions(dimensions);
  return createPatternFromCells(cells, { width, height });
}

export function patternPixelsToPattern(
  pixels: Rgb[],
  dimensions: PatternDimensions,
  palette: BeadColor[] = mardPalette,
  options: PatternProcessingOptions = {},
): Pattern {
  const normalizedDimensions = normalizePatternOutputDimensions(dimensions);
  const totalBeads = normalizedDimensions.width * normalizedDimensions.height;
  const sourcePixels = Array.from({ length: totalBeads }, (_, index) => pixels[index] ?? { r: 255, g: 255, b: 255 });
  const colorDistanceMode = normalizeColorDistanceMode(options.colorDistanceMode);
  const ditherMode = normalizeDitherMode(options.ditherMode);
  const maxColorCount = normalizeMaxColorCount(options.maxColorCount ?? defaultMaxColorCount);
  const matchedColors = ditherPixelsToPalette(sourcePixels, normalizedDimensions, palette, colorDistanceMode, ditherMode);
  const cappedColors = applyMaxColorCount(sourcePixels, matchedColors, maxColorCount, colorDistanceMode);
  const cells = patternPixelsToCells(cappedColors, normalizedDimensions);

  return cellsToPattern(cells, normalizedDimensions);
}

function patternPixelsToCells(colors: BeadColor[], dimensions: PatternDimensions) {
  return colors.map((color, index) => ({
    x: (index % dimensions.width) + 1,
    y: Math.floor(index / dimensions.width) + 1,
    color,
  }));
}
