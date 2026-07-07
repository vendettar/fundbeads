import { getLocalStorage } from "./browser-storage";
import {
  defaultColorDistanceMode,
  defaultDitherMode,
  defaultMaxColorCount,
  defaultSmoothingLevel,
  normalizeColorDistanceMode,
  normalizeDitherMode,
  normalizeMaxColorCount,
  normalizePatternDimension,
  normalizeSmoothingLevel,
  patternLongestEdgePresets,
  type ColorDistanceMode,
  type DitherMode,
  type MaxColorCount,
} from "./pattern";

export const patternPreferencesStorageKey = "fundbeads.patternPreferences";
export const patternPreferencesVersion = 1;

export type PatternPreferences = {
  longestEdge: number;
  colorDistanceMode: ColorDistanceMode;
  ditherMode: DitherMode;
  smoothingLevel: number;
  maxColorCount: MaxColorCount;
};

export const defaultPatternPreferences: PatternPreferences = {
  longestEdge: patternLongestEdgePresets[0],
  colorDistanceMode: defaultColorDistanceMode,
  ditherMode: defaultDitherMode,
  smoothingLevel: defaultSmoothingLevel,
  maxColorCount: defaultMaxColorCount,
};

export function normalizePatternPreferences(value: unknown): PatternPreferences | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    longestEdge: normalizePatternDimension(readNumber(value.longestEdge, defaultPatternPreferences.longestEdge)),
    colorDistanceMode: normalizeColorDistanceMode(readString(value.colorDistanceMode, defaultPatternPreferences.colorDistanceMode)),
    ditherMode: normalizeDitherMode(readString(value.ditherMode, defaultPatternPreferences.ditherMode)),
    smoothingLevel: normalizeSmoothingLevel(readNumber(value.smoothingLevel, defaultPatternPreferences.smoothingLevel)),
    maxColorCount: normalizeMaxColorCount(readNumber(value.maxColorCount, defaultPatternPreferences.maxColorCount)),
  };
}

export function readStoredPatternPreferences(storage: Storage | undefined = getLocalStorage()): PatternPreferences | null {
  try {
    const stored = storage?.getItem(patternPreferencesStorageKey);
    if (!stored) {
      return null;
    }
    return normalizePatternPreferences(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function writeStoredPatternPreferences(storage: Storage | undefined = getLocalStorage(), preferences: PatternPreferences) {
  const normalizedPreferences = normalizePatternPreferences(preferences) ?? defaultPatternPreferences;

  try {
    storage?.setItem(
      patternPreferencesStorageKey,
      JSON.stringify({
        version: patternPreferencesVersion,
        ...normalizedPreferences,
      }),
    );
  } catch {
    // Preference persistence is optional; image processing should continue if storage is unavailable.
  }
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
