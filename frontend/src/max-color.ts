import { nearestBeadColor, type ColorDistanceMode } from "./color-matching";
import type { BeadColor, Rgb } from "./palette";
import { summarizeColors } from "./pattern-model";

export const maxColorCountMin = 2;
export const maxColorCountMax = 64;
export const defaultMaxColorCount: MaxColorCount = 24;

export type MaxColorCount = number;

export function normalizeMaxColorCount(value: number): MaxColorCount {
  if (!Number.isFinite(value)) {
    return defaultMaxColorCount;
  }

  return Math.min(maxColorCountMax, Math.max(maxColorCountMin, Math.round(value)));
}

export function applyMaxColorCount(sourcePixels: Rgb[], matchedColors: BeadColor[], maxColorCount: MaxColorCount, mode: ColorDistanceMode): BeadColor[] {
  const usage = summarizeColors(matchedColors);
  if (usage.length <= maxColorCount) {
    return matchedColors;
  }

  const retainedPalette = usage.slice(0, maxColorCount).map(({ color }) => color);
  const retainedCodes = new Set(retainedPalette.map((color) => color.code));
  return matchedColors.map((matchedColor, index) => (retainedCodes.has(matchedColor.code) ? matchedColor : nearestBeadColor(sourcePixels[index], retainedPalette, mode)));
}
