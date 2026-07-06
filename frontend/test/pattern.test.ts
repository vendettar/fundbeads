import { describe, expect, it, vi } from "vitest";

import { mardPalette, type BeadColor } from "../src/palette";
import {
  cellsToPattern,
  colorDistanceModes,
  colorDistance,
  compositeRgbOverWhite,
  defaultColorDistanceMode,
  defaultDitherMode,
  defaultMaxColorCount,
  defaultSmoothingLevel,
  dimensionsForAspectRatio,
  ditherModes,
  imageFileToPattern,
  labDeltaE76,
  maxColorCountMax,
  maxColorCountMin,
  nearestBeadColor,
  normalizeColorDistanceMode,
  normalizeDitherMode,
  normalizeMaxColorCount,
  normalizeSmoothingLevel,
  patternPixelsToPattern,
  readableTextColor,
  summarizeCells,
  toCieLab,
  toOklab,
  weightedColorDistance,
  type PatternDimensions,
  type PatternCell,
} from "../src/pattern";

const palette: BeadColor[] = [
  { code: "B1", label: "Black", r: 0, g: 0, b: 0 },
  { code: "A1", label: "White", r: 255, g: 255, b: 255 },
  { code: "C2", label: "Red", r: 200, g: 0, b: 0 },
];

const presetDimensions: PatternDimensions[] = [
  { width: 52, height: 52 },
  { width: 64, height: 64 },
  { width: 78, height: 78 },
];
const longestEdgePresets = [52, 64, 78];

describe("pattern logic", () => {
  it.each([
    [{ r: 210, g: 15, b: 20 }, "C2"],
    [{ r: 245, g: 246, b: 250 }, "A1"],
  ] as const)("matches sampled color %o to nearest bead color %s", (sample, expectedCode) => {
    expect(nearestBeadColor(sample, palette).code).toBe(expectedCode);
  });

  it("keeps the first palette color when distances tie", () => {
    const tiePalette: BeadColor[] = [
      { code: "L1", label: "Left", r: 0, g: 0, b: 0 },
      { code: "R1", label: "Right", r: 20, g: 0, b: 0 },
    ];

    expect(nearestBeadColor({ r: 10, g: 0, b: 0 }, tiePalette, "rgb-fast")).toEqual(tiePalette[0]);
  });

  it("rejects empty palettes", () => {
    expect(() => nearestBeadColor({ r: 0, g: 0, b: 0 }, [])).toThrow("Palette must include at least one color.");
  });

  it("uses squared RGB distance", () => {
    expect(colorDistance({ r: 10, g: 20, b: 30 }, { r: 13, g: 24, b: 42 })).toBe(169);
  });

  it("uses weighted RGB distance when requested", () => {
    expect(weightedColorDistance({ r: 10, g: 20, b: 30 }, { r: 13, g: 24, b: 42 })).toBeCloseTo(27.98, 2);
  });

  it("exposes bounded color distance and dither controls with perceptual matching as the default", () => {
    expect(colorDistanceModes).toEqual(["oklab", "rgb-fast", "weighted-rgb", "lab-delta-e"]);
    expect(ditherModes).toEqual(["off", "floyd-steinberg", "ordered"]);
    expect(defaultColorDistanceMode).toBe("oklab");
    expect(defaultDitherMode).toBe("off");
    expect(maxColorCountMin).toBe(2);
    expect(maxColorCountMax).toBe(64);
    expect(defaultMaxColorCount).toBe(24);
    expect(defaultSmoothingLevel).toBe(0);
    expect(normalizeColorDistanceMode("lab-delta-e")).toBe("lab-delta-e");
    expect(normalizeColorDistanceMode("unknown")).toBe(defaultColorDistanceMode);
    expect(normalizeDitherMode("floyd-steinberg")).toBe("floyd-steinberg");
    expect(normalizeDitherMode("unknown")).toBe(defaultDitherMode);
    expect(normalizeSmoothingLevel(-1)).toBe(0);
    expect(normalizeSmoothingLevel(2.7)).toBe(3);
    expect(normalizeSmoothingLevel(99)).toBe(3);
    expect(normalizeMaxColorCount(0)).toBe(2);
    expect(normalizeMaxColorCount(1)).toBe(2);
    expect(normalizeMaxColorCount(24.6)).toBe(25);
    expect(normalizeMaxColorCount(99)).toBe(64);
  });

  it("converts RGB to stable Oklab coordinates", () => {
    const black = toOklab({ r: 0, g: 0, b: 0 });
    const white = toOklab({ r: 255, g: 255, b: 255 });

    expect(black).toEqual({ l: 0, a: 0, b: 0 });
    expect(white.l).toBeCloseTo(1, 5);
    expect(Math.abs(white.a)).toBeLessThan(0.0001);
    expect(Math.abs(white.b)).toBeLessThan(0.0001);
  });

  it("converts RGB to stable CIE Lab coordinates and Delta-E 76 distances", () => {
    const black = toCieLab({ r: 0, g: 0, b: 0 });
    const white = toCieLab({ r: 255, g: 255, b: 255 });
    const red = toCieLab({ r: 255, g: 0, b: 0 });

    expect(black).toEqual({ l: 0, a: 0, b: 0 });
    expect(white.l).toBeCloseTo(100, 4);
    expect(Math.abs(white.a)).toBeLessThan(0.001);
    expect(Math.abs(white.b)).toBeLessThan(0.001);
    expect(red.l).toBeCloseTo(53.24, 2);
    expect(red.a).toBeCloseTo(80.09, 2);
    expect(red.b).toBeCloseTo(67.2, 2);
    expect(labDeltaE76(black, white)).toBeCloseTo(100, 3);
  });

  it.each([
    [{ r: 24, g: 80, b: 160 }, 1, { r: 24, g: 80, b: 160 }],
    [{ r: 24, g: 80, b: 160 }, 0, { r: 255, g: 255, b: 255 }],
    [{ r: 20, g: 40, b: 80 }, 0.5, { r: 138, g: 148, b: 168 }],
  ] as const)("composites %o over white with alpha %s", (color, alpha, expected) => {
    expect(compositeRgbOverWhite(color, alpha)).toEqual(expected);
  });

  it("summarizes cells by bead color count", () => {
    const usage = summarizeCells([
      { x: 1, y: 1, color: palette[2] },
      { x: 2, y: 1, color: palette[2] },
      { x: 1, y: 2, color: palette[0] },
    ]);

    expect(usage).toEqual([
      { color: palette[2], count: 2 },
      { color: palette[0], count: 1 },
    ]);
  });

  it("sorts equal summary counts by bead code", () => {
    const usage = summarizeCells([
      { x: 1, y: 1, color: palette[2] },
      { x: 2, y: 1, color: palette[0] },
      { x: 3, y: 1, color: palette[1] },
    ]);

    expect(usage.map(({ color }) => color.code)).toEqual(["A1", "B1", "C2"]);
  });

  it("builds pattern totals from cells", () => {
    const pattern = cellsToPattern(
      [
        { x: 1, y: 1, color: palette[0] },
        { x: 2, y: 1, color: palette[1] },
      ],
      { width: 40, height: 40 },
    ) as { width?: number; height?: number; totalBeads: number; usage: unknown[]; size?: unknown };

    expect(pattern.width).toBe(40);
    expect(pattern.height).toBe(40);
    expect(pattern.size).toBeUndefined();
    expect(pattern.totalBeads).toBe(2);
    expect(pattern.usage).toHaveLength(2);
  });

  it("exposes bounded adjustable dimensions and longest-edge presets", async () => {
    const patternModule = (await import("../src/pattern")) as {
      patternDimensionMin?: number;
      patternDimensionMax?: number;
      patternLongestEdgePresets?: number[];
      normalizePatternDimensions?: (dimensions: PatternDimensions) => PatternDimensions;
      dimensionsForAspectRatio?: (source: { width: number; height: number }, longestEdge: number) => PatternDimensions;
    };

    expect(patternModule.patternDimensionMin).toBe(40);
    expect(patternModule.patternDimensionMax).toBe(100);
    expect(patternModule.patternLongestEdgePresets).toEqual(longestEdgePresets);
    expect(patternModule.normalizePatternDimensions).toBeTypeOf("function");
    expect(patternModule.dimensionsForAspectRatio).toBeTypeOf("function");

    if (!patternModule.normalizePatternDimensions) {
      return;
    }

    expect(patternModule.normalizePatternDimensions({ width: 39, height: 101 })).toEqual({ width: 40, height: 100 });
    expect(patternModule.normalizePatternDimensions({ width: 60.7, height: 59.2 })).toEqual({ width: 61, height: 59 });
    expect(patternModule.normalizePatternDimensions({ width: Number.NaN, height: Number.POSITIVE_INFINITY })).toEqual({ width: 40, height: 40 });
  });

  it.each([
    [{ width: 3840, height: 2160 }, 52, { width: 52, height: 29 }],
    [{ width: 3840, height: 2160 }, 64, { width: 64, height: 36 }],
    [{ width: 3840, height: 2160 }, 80, { width: 80, height: 45 }],
    [{ width: 2160, height: 3840 }, 64, { width: 36, height: 64 }],
    [{ width: 2160, height: 3840 }, 80, { width: 45, height: 80 }],
    [{ width: 3000, height: 3000 }, 80, { width: 80, height: 80 }],
    [{ width: 1600, height: 1000 }, 80, { width: 80, height: 50 }],
    [{ width: 1000, height: 1600 }, 80, { width: 50, height: 80 }],
    [{ width: 9000, height: 1000 }, 100, { width: 100, height: 11 }],
    [{ width: 1000, height: 9000 }, 100, { width: 11, height: 100 }],
    [{ width: Number.NaN, height: 1000 }, 80, { width: 80, height: 80 }],
  ] as const)("derives pattern dimensions for source %o and longest edge %s", (source, longestEdge, expected) => {
    expect(dimensionsForAspectRatio(source, longestEdge)).toEqual(expected);
  });

  it.each([
    { width: 40, height: 40 },
    { width: 100, height: 100 },
    { width: 40, height: 100 },
    { width: 100, height: 40 },
    ...presetDimensions,
  ])("builds complete $width x $height pattern totals from cells", (dimensions) => {
    const cells = createSolidGrid(dimensions, palette[0]);

    const pattern = cellsToPattern(cells, dimensions) as {
      width?: number;
      height?: number;
      cells: PatternCell[];
      usage: { color: BeadColor; count: number }[];
      totalBeads: number;
      size?: unknown;
    };
    const usageTotal = pattern.usage.reduce((total, item) => total + item.count, 0);

    expect(pattern.width).toBe(dimensions.width);
    expect(pattern.height).toBe(dimensions.height);
    expect(pattern.size).toBeUndefined();
    expect(pattern.totalBeads).toBe(dimensions.width * dimensions.height);
    expect(pattern.cells).toHaveLength(dimensions.width * dimensions.height);
    expect(usageTotal).toBe(pattern.totalBeads);
    expect(pattern.usage).toEqual([{ color: palette[0], count: dimensions.width * dimensions.height }]);
  });

  it("limits the final pattern to the most-used colors and remaps cells to the retained palette", () => {
    const limitPalette = Array.from({ length: 13 }, (_, index) => {
      const channel = index * 20;
      return { code: `A${String(index).padStart(2, "0")}`, label: `Color ${index}`, r: channel, g: channel, b: channel };
    });
    const sourcePixels = limitPalette.flatMap((color, index) => {
      const count = index === 0 ? 1_000 : 50;
      return Array.from({ length: count }, () => ({ r: color.r, g: color.g, b: color.b }));
    });

    const pattern = patternPixelsToPattern(sourcePixels, { width: 40, height: 40 }, limitPalette, {
      colorDistanceMode: "rgb-fast",
      maxColorCount: 12,
    });

    expect(pattern.cells).toHaveLength(1_600);
    expect(pattern.usage).toHaveLength(12);
    expect(pattern.usage.map(({ color }) => color.code)).not.toContain("A12");
    expect(new Set(pattern.cells.map((cell) => cell.color.code)).size).toBe(12);
  });

  it("preserves cells already matched to retained colors when max color limiting remaps dropped colors", () => {
    const limitPalette: BeadColor[] = [
      { code: "A1", label: "Tie winner", r: 0, g: 0, b: 0 },
      { code: "B1", label: "Dominant retained", r: 20, g: 0, b: 0 },
      { code: "C1", label: "Dropped", r: 200, g: 0, b: 0 },
    ];
    const tiedToA = { r: 10, g: 0, b: 0 };
    const sourcePixels = [
      ...Array.from({ length: 600 }, () => tiedToA),
      ...Array.from({ length: 700 }, () => ({ r: 20, g: 0, b: 0 })),
      ...Array.from({ length: 300 }, () => ({ r: 200, g: 0, b: 0 })),
    ];

    const pattern = patternPixelsToPattern(sourcePixels, { width: 40, height: 40 }, limitPalette, {
      colorDistanceMode: "rgb-fast",
      maxColorCount: 2,
    });

    expect(pattern.usage.map(({ color }) => color.code)).toEqual(["B1", "A1"]);
    expect(pattern.cells.slice(0, 600).every((cell) => cell.color.code === "A1")).toBe(true);
  });

  it("keeps Floyd-Steinberg dithering deterministic without changing pattern coordinates", () => {
    const sourcePixels = Array.from({ length: 1_600 }, (_, index) => {
      const channel = Math.round((index / 1_599) * 255);
      return { r: channel, g: channel, b: channel };
    });

    const pattern = patternPixelsToPattern(sourcePixels, { width: 40, height: 40 }, palette, {
      colorDistanceMode: "rgb-fast",
      ditherMode: "floyd-steinberg",
    });

    expect(pattern.width).toBe(40);
    expect(pattern.height).toBe(40);
    expect(pattern.totalBeads).toBe(1_600);
    expect(pattern.cells.slice(0, 42).map(({ x, y }) => `${x},${y}`).slice(0, 3)).toEqual(["1,1", "2,1", "3,1"]);
    expect(pattern.cells[40]).toMatchObject({ x: 1, y: 2 });
    expect(pattern.usage.reduce((total, item) => total + item.count, 0)).toBe(1_600);
  });

  it("uses ordered dithering as a deterministic threshold matrix", () => {
    const blackWhitePalette: BeadColor[] = [
      { code: "B1", label: "Black", r: 0, g: 0, b: 0 },
      { code: "A1", label: "White", r: 255, g: 255, b: 255 },
    ];
    const sourcePixels = Array.from({ length: 1_600 }, () => ({ r: 127, g: 127, b: 127 }));

    const pattern = patternPixelsToPattern(sourcePixels, { width: 40, height: 40 }, blackWhitePalette, {
      colorDistanceMode: "rgb-fast",
      ditherMode: "ordered",
    });

    expect(Object.fromEntries(pattern.usage.map(({ color, count }) => [color.code, count]))).toEqual({ A1: 800, B1: 800 });
  });

  it("samples rectangular image data using width-based row-major offsets", async () => {
    const width = 40;
    const height = 41;
    const sampledPositions = [
      { x: 1, y: 1, color: mardPalette[0] },
      { x: 2, y: 1, color: mardPalette[1] },
      { x: 40, y: 1, color: mardPalette[2] },
      { x: 1, y: 2, color: mardPalette[3] },
      { x: 2, y: 2, color: mardPalette[4] },
      { x: 40, y: 41, color: mardPalette[5] },
    ];
    const pixels = new Uint8ClampedArray(width * height * 4);
    const bitmap = { width, height, close: vi.fn() };
    const context = {
      imageSmoothingEnabled: false,
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: pixels })),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    };

    sampledPositions.forEach(({ x, y, color }) => {
      const offset = ((y - 1) * width + (x - 1)) * 4;
      pixels[offset] = color.r;
      pixels[offset + 1] = color.g;
      pixels[offset + 2] = color.b;
      pixels[offset + 3] = 255;
    });

    vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
    vi.stubGlobal("document", {
      createElement: vi.fn(() => canvas),
    });

    try {
      const onSourceImageSize = vi.fn();
      const pattern = await imageFileToPattern({ type: "image/png" } as File, height, onSourceImageSize, {
        colorDistanceMode: "rgb-fast",
        ditherMode: "off",
        smoothingLevel: 0,
        maxColorCount: maxColorCountMax,
      });

      expect(onSourceImageSize).toHaveBeenCalledWith({ width, height });
      expect(canvas.width).toBe(width);
      expect(canvas.height).toBe(height);
      expect(context.clearRect).toHaveBeenCalledWith(0, 0, width, height);
      expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, width, height);
      expect(context.getImageData).toHaveBeenCalledWith(0, 0, width, height);
      expect(sampledPositions.map(({ x, y }) => pattern.cells[(y - 1) * width + (x - 1)]).map((cell) => `${cell.x},${cell.y}:${cell.color.code}`)).toEqual(
        sampledPositions.map(({ x, y, color }) => `${x},${y}:${color.code}`),
      );
      expect(pattern.totalBeads).toBe(width * height);
      expect(bitmap.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("preserves a 16:9 source ratio when the derived short edge is below the minimum longest-edge control size", async () => {
    const sourceWidth = 1600;
    const sourceHeight = 900;
    const patternWidth = 64;
    const patternHeight = 36;
    const pixels = new Uint8ClampedArray(patternWidth * patternHeight * 4);
    pixels.fill(255);
    const bitmap = { width: sourceWidth, height: sourceHeight, close: vi.fn() };
    const context = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      filter: "none",
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: pixels })),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    };

    vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
    vi.stubGlobal("document", {
      createElement: vi.fn(() => canvas),
    });

    try {
      const pattern = await imageFileToPattern({ type: "image/png" } as File, patternWidth, undefined, {
        colorDistanceMode: "rgb-fast",
        ditherMode: "off",
        smoothingLevel: 0,
        maxColorCount: maxColorCountMax,
      });

      expect(canvas.width).toBe(patternWidth);
      expect(canvas.height).toBe(patternHeight);
      expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, patternWidth, patternHeight);
      expect(context.getImageData).toHaveBeenCalledWith(0, 0, patternWidth, patternHeight);
      expect(pattern.width).toBe(patternWidth);
      expect(pattern.height).toBe(patternHeight);
      expect(pattern.totalBeads).toBe(patternWidth * patternHeight);
      expect(pattern.cells).toHaveLength(patternWidth * patternHeight);
      expect(bitmap.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("chooses readable text against light and dark colors", () => {
    expect(readableTextColor({ r: 250, g: 250, b: 250 })).toBe("#111111");
    expect(readableTextColor({ r: 20, g: 20, b: 20 })).toBe("#ffffff");
  });
});

describe("MARD 221 palette contract", () => {
  it("exposes MARD 221 as the active palette definition", async () => {
    const paletteModule = (await import("../src/palette")) as {
      mard221Palette?: {
        slug?: string;
        name?: string;
        colorCount?: number;
        colors?: unknown[];
      };
    };

    expect(paletteModule.mard221Palette?.slug).toBe("mard-221");
    expect(paletteModule.mard221Palette?.name).toBe("MARD 221");
    expect(paletteModule.mard221Palette?.colorCount).toBe(221);
    expect(paletteModule.mard221Palette?.colors).toBe(mardPalette);
  });

  it("uses exactly the MARD 221 color groups", () => {
    const expectedGroups = {
      A: 26,
      B: 32,
      C: 29,
      D: 26,
      E: 24,
      F: 25,
      G: 21,
      H: 23,
      M: 15,
    };

    const groups = new Map<string, number>();

    for (const color of mardPalette) {
      const family = color.code.replace(/[0-9]+$/, "");
      groups.set(family, (groups.get(family) ?? 0) + 1);
    }

    expect(Object.fromEntries(groups)).toEqual(expectedGroups);
    expect(mardPalette).toHaveLength(221);
  });

  it("uses unique color codes with valid RGB channels and stable MARD labels", () => {
    const codes = new Set<string>();

    for (const color of mardPalette) {
      codes.add(color.code);

      expect(color.code).toMatch(/^[A-Z][0-9]+$/);
      expect(color.label).toBe(`MARD ${color.code}`);
      expect(Number.isInteger(color.r)).toBe(true);
      expect(Number.isInteger(color.g)).toBe(true);
      expect(Number.isInteger(color.b)).toBe(true);
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }

    expect(codes.size).toBe(mardPalette.length);
  });

  it("keeps RGB channels aligned with each stored HEX value", () => {
    for (const color of mardPalette) {
      const paletteColor = color as BeadColor & { hex: string };
      const hex = `#${[paletteColor.r, paletteColor.g, paletteColor.b]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`;

      expect(paletteColor.hex).toBe(hex);
    }
  });

  it("matches exact MARD 221 colors to their own bead codes", () => {
    expect(nearestBeadColor({ r: 250, g: 245, b: 205 }).code).toBe("A1");
    expect(nearestBeadColor({ r: 255, g: 255, b: 255 }).code).toBe("H1");
    expect(nearestBeadColor({ r: 116, g: 125, b: 122 }).code).toBe("M15");
  });
});

function createSolidGrid({ width, height }: PatternDimensions, color: BeadColor): PatternCell[] {
  const cells: PatternCell[] = [];

  for (let y = 1; y <= height; y += 1) {
    for (let x = 1; x <= width; x += 1) {
      cells.push({ x, y, color });
    }
  }

  return cells;
}
