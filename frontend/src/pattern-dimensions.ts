import type { PatternDimensions, SourceImageSize } from "./pattern-model";

export const patternDimensionMin = 40;
export const patternDimensionMax = 100;
export const patternOutputDimensionMin = 1;

export const patternLongestEdgePresets = [52, 64, 78];

export function normalizePatternDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return patternDimensionMin;
  }

  return Math.min(patternDimensionMax, Math.max(patternDimensionMin, Math.round(value)));
}

export function normalizePatternDimensions(dimensions: PatternDimensions): PatternDimensions {
  return normalizePatternOutputDimensions(dimensions);
}

function normalizePatternOutputDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return patternDimensionMin;
  }

  return Math.min(patternDimensionMax, Math.max(patternOutputDimensionMin, Math.round(value)));
}

export function normalizePatternOutputDimensions(dimensions: PatternDimensions): PatternDimensions {
  return {
    width: normalizePatternOutputDimension(dimensions.width),
    height: normalizePatternOutputDimension(dimensions.height),
  };
}

export function dimensionsForAspectRatio(source: SourceImageSize, longestEdge: number): PatternDimensions {
  const normalizedLongestEdge = normalizePatternDimension(longestEdge);
  const sourceWidth = source.width;
  const sourceHeight = source.height;

  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: normalizedLongestEdge, height: normalizedLongestEdge };
  }

  if (sourceWidth >= sourceHeight) {
    return normalizePatternOutputDimensions({
      width: normalizedLongestEdge,
      height: (normalizedLongestEdge * sourceHeight) / sourceWidth,
    });
  }

  return normalizePatternOutputDimensions({
    width: (normalizedLongestEdge * sourceWidth) / sourceHeight,
    height: normalizedLongestEdge,
  });
}
