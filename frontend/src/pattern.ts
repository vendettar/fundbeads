import type { BeadColor, Rgb } from "./palette";
import { mardPalette } from "./palette";

export const patternDimensionMin = 40;
export const patternDimensionMax = 100;

export type PatternDimensions = {
  width: number;
  height: number;
};

export type SourceImageSize = {
  width: number;
  height: number;
};

export type PatternCell = {
  x: number;
  y: number;
  color: BeadColor;
};

export type ColorUsage = {
  color: BeadColor;
  count: number;
};

export type Pattern = {
  width: number;
  height: number;
  cells: PatternCell[];
  usage: ColorUsage[];
  totalBeads: number;
};

export const patternLongestEdgePresets = [52, 64, 78];

export function normalizePatternDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return patternDimensionMin;
  }

  return Math.min(patternDimensionMax, Math.max(patternDimensionMin, Math.round(value)));
}

export function normalizePatternDimensions(dimensions: PatternDimensions): PatternDimensions {
  return {
    width: normalizePatternDimension(dimensions.width),
    height: normalizePatternDimension(dimensions.height),
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
    return normalizePatternDimensions({
      width: normalizedLongestEdge,
      height: (normalizedLongestEdge * sourceHeight) / sourceWidth,
    });
  }

  return normalizePatternDimensions({
    width: (normalizedLongestEdge * sourceWidth) / sourceHeight,
    height: normalizedLongestEdge,
  });
}

export function colorDistance(a: Rgb, b: Rgb): number {
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return red * red + green * green + blue * blue;
}

export function compositeRgbOverWhite(color: Rgb, alpha: number): Rgb {
  return {
    r: Math.round(color.r * alpha + 255 * (1 - alpha)),
    g: Math.round(color.g * alpha + 255 * (1 - alpha)),
    b: Math.round(color.b * alpha + 255 * (1 - alpha)),
  };
}

export function nearestBeadColor(color: Rgb, palette: BeadColor[] = mardPalette): BeadColor {
  if (palette.length === 0) {
    throw new Error("Palette must include at least one color.");
  }

  let closest = palette[0];
  let closestDistance = colorDistance(color, closest);

  for (let index = 1; index < palette.length; index += 1) {
    const candidate = palette[index];
    const candidateDistance = colorDistance(color, candidate);
    if (candidateDistance < closestDistance) {
      closest = candidate;
      closestDistance = candidateDistance;
    }
  }

  return closest;
}

export function readableTextColor(color: Rgb): "#111111" | "#ffffff" {
  const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
  return luminance > 0.58 ? "#111111" : "#ffffff";
}

export function summarizeCells(cells: PatternCell[]): ColorUsage[] {
  const counts = new Map<string, ColorUsage>();

  for (const cell of cells) {
    const existing = counts.get(cell.color.code);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(cell.color.code, { color: cell.color, count: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.color.code.localeCompare(b.color.code));
}

export function cellsToPattern(cells: PatternCell[], dimensions: PatternDimensions): Pattern {
  const { width, height } = normalizePatternDimensions(dimensions);

  return {
    width,
    height,
    cells,
    usage: summarizeCells(cells),
    totalBeads: cells.length,
  };
}

export async function imageFileToPattern(file: File, longestEdge: number, onSourceImageSize?: (source: SourceImageSize) => void): Promise<Pattern> {
  const bitmap = await createImageBitmap(file);

  try {
    const sourceImageSize = { width: bitmap.width, height: bitmap.height };
    onSourceImageSize?.(sourceImageSize);
    const { width, height } = dimensionsForAspectRatio(sourceImageSize, longestEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Could not create canvas context.");
    }

    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height).data;
    const cells: PatternCell[] = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const alpha = pixels[offset + 3] / 255;
        const sampled = compositeRgbOverWhite({ r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] }, alpha);

        cells.push({
          x: x + 1,
          y: y + 1,
          color: nearestBeadColor(sampled),
        });
      }
    }

    return cellsToPattern(cells, { width, height });
  } finally {
    bitmap.close();
  }
}
