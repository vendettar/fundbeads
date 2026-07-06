import { nearestBeadColor, type ColorDistanceMode } from "./color-matching";
import type { BeadColor, Rgb } from "./palette";
import type { PatternDimensions } from "./pattern-model";

export const ditherModes = ["off", "floyd-steinberg", "ordered"] as const;
export const defaultDitherMode: DitherMode = "off";

export type DitherMode = (typeof ditherModes)[number];

const orderedDitherMatrix4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;
const orderedDitherStrength = 48;

export function normalizeDitherMode(value: string | null | undefined): DitherMode {
  return ditherModes.some((mode) => mode === value) ? (value as DitherMode) : defaultDitherMode;
}

export function ditherPixelsToPalette(
  sourcePixels: Rgb[],
  dimensions: PatternDimensions,
  palette: BeadColor[],
  colorDistanceMode: ColorDistanceMode,
  ditherMode: DitherMode,
): BeadColor[] {
  if (ditherMode === "floyd-steinberg") {
    return floydSteinbergDitherPixelsToPalette(sourcePixels, dimensions, palette, colorDistanceMode);
  }

  if (ditherMode === "ordered") {
    return orderedDitherPixelsToPalette(sourcePixels, dimensions, palette, colorDistanceMode);
  }

  return sourcePixels.map((pixel) => nearestBeadColor(pixel, palette, colorDistanceMode));
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
