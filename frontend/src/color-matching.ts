import type { BeadColor, Rgb } from "./palette";
import { mardPalette } from "./palette";

export const colorDistanceModes = ["oklab", "rgb-fast", "weighted-rgb", "lab-delta-e"] as const;
export const defaultColorDistanceMode: ColorDistanceMode = "oklab";

export type ColorDistanceMode = (typeof colorDistanceModes)[number];

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

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, value));
}
