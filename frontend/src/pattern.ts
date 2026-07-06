import type { BeadColor, Rgb } from "./palette";
import { mardPalette } from "./palette";

export const patternDimensionMin = 40;
export const patternDimensionMax = 100;
const patternOutputDimensionMin = 1;

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
export const colorDistanceModes = ["oklab", "rgb-fast", "weighted-rgb", "lab-delta-e"] as const;
export const ditherModes = ["off", "floyd-steinberg", "ordered"] as const;
export const maxColorCountMin = 2;
export const maxColorCountMax = 64;
export const defaultColorDistanceMode: ColorDistanceMode = "oklab";
export const defaultDitherMode: DitherMode = "off";
export const defaultSmoothingLevel = 0;
export const smoothingLevelMin = 0;
export const smoothingLevelMax = 3;
export const defaultMaxColorCount: MaxColorCount = 24;

export type ColorDistanceMode = (typeof colorDistanceModes)[number];
export type DitherMode = (typeof ditherModes)[number];
export type MaxColorCount = number;

export type PatternProcessingOptions = {
  colorDistanceMode?: ColorDistanceMode;
  ditherMode?: DitherMode;
  smoothingLevel?: number;
  maxColorCount?: number;
};

export type OklabColor = {
  l: number;
  a: number;
  b: number;
};

export type CieLabColor = {
  l: number;
  a: number;
  b: number;
};

type PaletteOklabEntry = {
  color: BeadColor;
  oklab: OklabColor;
};

type PaletteLabEntry = {
  color: BeadColor;
  lab: CieLabColor;
};

const oklabPaletteCache = new WeakMap<BeadColor[], PaletteOklabEntry[]>();
const labPaletteCache = new WeakMap<BeadColor[], PaletteLabEntry[]>();
const orderedDitherMatrix4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;
const orderedDitherStrength = 48;

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

function normalizePatternOutputDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return patternDimensionMin;
  }

  return Math.min(patternDimensionMax, Math.max(patternOutputDimensionMin, Math.round(value)));
}

function normalizePatternOutputDimensions(dimensions: PatternDimensions): PatternDimensions {
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

export function colorDistance(a: Rgb, b: Rgb): number {
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return red * red + green * green + blue * blue;
}

export function weightedColorDistance(a: Rgb, b: Rgb): number {
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return 0.3 * red * red + 0.59 * green * green + 0.11 * blue * blue;
}

export function normalizeColorDistanceMode(value: string | null | undefined): ColorDistanceMode {
  return colorDistanceModes.some((mode) => mode === value) ? (value as ColorDistanceMode) : defaultColorDistanceMode;
}

export function normalizeDitherMode(value: string | null | undefined): DitherMode {
  return ditherModes.some((mode) => mode === value) ? (value as DitherMode) : defaultDitherMode;
}

export function normalizeSmoothingLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultSmoothingLevel;
  }

  return Math.min(smoothingLevelMax, Math.max(smoothingLevelMin, Math.round(value)));
}

export function normalizeMaxColorCount(value: number): MaxColorCount {
  if (!Number.isFinite(value)) {
    return defaultMaxColorCount;
  }

  return Math.min(maxColorCountMax, Math.max(maxColorCountMin, Math.round(value)));
}

export function compositeRgbOverWhite(color: Rgb, alpha: number): Rgb {
  return {
    r: Math.round(color.r * alpha + 255 * (1 - alpha)),
    g: Math.round(color.g * alpha + 255 * (1 - alpha)),
    b: Math.round(color.b * alpha + 255 * (1 - alpha)),
  };
}

export function toOklab(color: Rgb): OklabColor {
  const red = srgbChannelToLinear(color.r);
  const green = srgbChannelToLinear(color.g);
  const blue = srgbChannelToLinear(color.b);

  const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

export function toCieLab(color: Rgb): CieLabColor {
  const red = srgbChannelToLinear(color.r);
  const green = srgbChannelToLinear(color.g);
  const blue = srgbChannelToLinear(color.b);

  const x = 0.4124564 * red + 0.3575761 * green + 0.1804375 * blue;
  const y = 0.2126729 * red + 0.7151522 * green + 0.072175 * blue;
  const z = 0.0193339 * red + 0.119192 * green + 0.9503041 * blue;

  const fx = labPivot(x / 0.95047);
  const fy = labPivot(y);
  const fz = labPivot(z / 1.08883);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function labDeltaE76(a: CieLabColor, b: CieLabColor): number {
  return Math.sqrt(labDistanceSquared(a, b));
}

export function nearestBeadColor(color: Rgb, palette: BeadColor[] = mardPalette, mode: ColorDistanceMode = defaultColorDistanceMode): BeadColor {
  if (palette.length === 0) {
    throw new Error("Palette must include at least one color.");
  }

  const normalizedMode = normalizeColorDistanceMode(mode);
  if (normalizedMode === "oklab") {
    const sample = toOklab(color);
    const oklabPalette = getOklabPalette(palette);
    let closest = oklabPalette[0].color;
    let closestDistance = oklabDistance(sample, oklabPalette[0].oklab);

    for (let index = 1; index < oklabPalette.length; index += 1) {
      const candidate = oklabPalette[index];
      const candidateDistance = oklabDistance(sample, candidate.oklab);
      if (candidateDistance < closestDistance) {
        closest = candidate.color;
        closestDistance = candidateDistance;
      }
    }

    return closest;
  }

  if (normalizedMode === "lab-delta-e") {
    const sample = toCieLab(color);
    const labPalette = getLabPalette(palette);
    let closest = labPalette[0].color;
    let closestDistance = labDistanceSquared(sample, labPalette[0].lab);

    for (let index = 1; index < labPalette.length; index += 1) {
      const candidate = labPalette[index];
      const candidateDistance = labDistanceSquared(sample, candidate.lab);
      if (candidateDistance < closestDistance) {
        closest = candidate.color;
        closestDistance = candidateDistance;
      }
    }

    return closest;
  }

  const distance = normalizedMode === "weighted-rgb" ? weightedColorDistance : colorDistance;
  let closest = palette[0];
  let closestDistance = distance(color, closest);

  for (let index = 1; index < palette.length; index += 1) {
    const candidate = palette[index];
    const candidateDistance = distance(color, candidate);
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
  const { width, height } = normalizePatternOutputDimensions(dimensions);

  return {
    width,
    height,
    cells,
    usage: summarizeCells(cells),
    totalBeads: cells.length,
  };
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
  const matchedColors =
    ditherMode === "floyd-steinberg"
      ? floydSteinbergDitherPixelsToPalette(sourcePixels, normalizedDimensions, palette, colorDistanceMode)
      : ditherMode === "ordered"
        ? orderedDitherPixelsToPalette(sourcePixels, normalizedDimensions, palette, colorDistanceMode)
        : sourcePixels.map((pixel) => nearestBeadColor(pixel, palette, colorDistanceMode));
  const cappedColors = applyMaxColorCount(sourcePixels, matchedColors, maxColorCount, colorDistanceMode);
  const cells = cappedColors.map((color, index) => ({
    x: (index % normalizedDimensions.width) + 1,
    y: Math.floor(index / normalizedDimensions.width) + 1,
    color,
  }));

  return cellsToPattern(cells, normalizedDimensions);
}

export async function imageFileToPattern(
  file: File,
  longestEdge: number,
  onSourceImageSize?: (source: SourceImageSize) => void,
  options: PatternProcessingOptions = {},
): Promise<Pattern> {
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

    const smoothingLevel = normalizeSmoothingLevel(options.smoothingLevel ?? defaultSmoothingLevel);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = smoothingLevel >= 2 ? "high" : smoothingLevel === 1 ? "medium" : "low";
    context.filter = smoothingLevel > 0 ? `blur(${(smoothingLevel * 0.35).toFixed(2)}px)` : "none";
    context.clearRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    context.filter = "none";

    const pixels = context.getImageData(0, 0, width, height).data;
    const sourcePixels: Rgb[] = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const alpha = pixels[offset + 3] / 255;
        const sampled = compositeRgbOverWhite({ r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] }, alpha);
        sourcePixels.push(sampled);
      }
    }

    return patternPixelsToPattern(sourcePixels, { width, height }, mardPalette, options);
  } finally {
    bitmap.close();
  }
}

function srgbChannelToLinear(channel: number): number {
  const normalized = clampChannel(channel) / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function oklabDistance(a: OklabColor, b: OklabColor): number {
  const l = a.l - b.l;
  const greenRed = a.a - b.a;
  const blueYellow = a.b - b.b;
  return l * l + greenRed * greenRed + blueYellow * blueYellow;
}

function labDistanceSquared(a: CieLabColor, b: CieLabColor): number {
  const lightness = a.l - b.l;
  const greenRed = a.a - b.a;
  const blueYellow = a.b - b.b;
  return lightness * lightness + greenRed * greenRed + blueYellow * blueYellow;
}

function labPivot(value: number): number {
  return value > 216 / 24389 ? Math.cbrt(value) : (841 / 108) * value + 4 / 29;
}

function getOklabPalette(palette: BeadColor[]): PaletteOklabEntry[] {
  const cached = oklabPaletteCache.get(palette);
  if (cached) {
    return cached;
  }

  const converted = palette.map((color) => ({ color, oklab: toOklab(color) }));
  oklabPaletteCache.set(palette, converted);
  return converted;
}

function getLabPalette(palette: BeadColor[]): PaletteLabEntry[] {
  const cached = labPaletteCache.get(palette);
  if (cached) {
    return cached;
  }

  const converted = palette.map((color) => ({ color, lab: toCieLab(color) }));
  labPaletteCache.set(palette, converted);
  return converted;
}

function floydSteinbergDitherPixelsToPalette(sourcePixels: Rgb[], dimensions: PatternDimensions, palette: BeadColor[], colorDistanceMode: ColorDistanceMode): BeadColor[] {
  const workingPixels = sourcePixels.map((pixel) => ({ r: pixel.r, g: pixel.g, b: pixel.b }));
  const matchedColors: BeadColor[] = [];

  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const index = y * dimensions.width + x;
      const current = clampRgb(workingPixels[index]);
      const matched = nearestBeadColor(current, palette, colorDistanceMode);
      matchedColors[index] = matched;

      const error = {
        r: current.r - matched.r,
        g: current.g - matched.g,
        b: current.b - matched.b,
      };

      addDitherError(workingPixels, dimensions, x + 1, y, error, 7 / 16);
      addDitherError(workingPixels, dimensions, x - 1, y + 1, error, 3 / 16);
      addDitherError(workingPixels, dimensions, x, y + 1, error, 5 / 16);
      addDitherError(workingPixels, dimensions, x + 1, y + 1, error, 1 / 16);
    }
  }

  return matchedColors;
}

function orderedDitherPixelsToPalette(sourcePixels: Rgb[], dimensions: PatternDimensions, palette: BeadColor[], colorDistanceMode: ColorDistanceMode): BeadColor[] {
  return sourcePixels.map((pixel, index) => {
    const x = index % dimensions.width;
    const y = Math.floor(index / dimensions.width);
    const matrixValue = orderedDitherMatrix4[y % 4][x % 4];
    const threshold = ((matrixValue + 0.5) / 16 - 0.5) * orderedDitherStrength;
    return nearestBeadColor(
      {
        r: clampChannel(pixel.r + threshold),
        g: clampChannel(pixel.g + threshold),
        b: clampChannel(pixel.b + threshold),
      },
      palette,
      colorDistanceMode,
    );
  });
}

function addDitherError(pixels: Rgb[], dimensions: PatternDimensions, x: number, y: number, error: Rgb, factor: number) {
  if (x < 0 || y < 0 || x >= dimensions.width || y >= dimensions.height) {
    return;
  }

  const index = y * dimensions.width + x;
  const pixel = pixels[index];
  pixels[index] = {
    r: clampChannel(pixel.r + error.r * factor),
    g: clampChannel(pixel.g + error.g * factor),
    b: clampChannel(pixel.b + error.b * factor),
  };
}

function applyMaxColorCount(sourcePixels: Rgb[], matchedColors: BeadColor[], maxColorCount: MaxColorCount, mode: ColorDistanceMode): BeadColor[] {
  const usage = summarizeColors(matchedColors);
  if (usage.length <= maxColorCount) {
    return matchedColors;
  }

  const retainedPalette = usage.slice(0, maxColorCount).map(({ color }) => color);
  const retainedCodes = new Set(retainedPalette.map((color) => color.code));
  return matchedColors.map((matchedColor, index) => (retainedCodes.has(matchedColor.code) ? matchedColor : nearestBeadColor(sourcePixels[index], retainedPalette, mode)));
}

function summarizeColors(colors: BeadColor[]): ColorUsage[] {
  const cells = colors.map((color, index) => ({ x: index + 1, y: 1, color }));
  return summarizeCells(cells);
}

function clampRgb(color: Rgb): Rgb {
  return {
    r: clampChannel(color.r),
    g: clampChannel(color.g),
    b: clampChannel(color.b),
  };
}

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, value));
}
