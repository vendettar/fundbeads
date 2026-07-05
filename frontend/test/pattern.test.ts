import { describe, expect, it } from "vitest";

import { mardPalette, type BeadColor } from "../src/palette";
import {
  cellsToPattern,
  colorDistance,
  compositeRgbOverWhite,
  gridSizes,
  nearestBeadColor,
  readableTextColor,
  summarizeCells,
  type GridSize,
  type PatternCell,
} from "../src/pattern";

const palette: BeadColor[] = [
  { code: "B1", label: "Black", r: 0, g: 0, b: 0 },
  { code: "A1", label: "White", r: 255, g: 255, b: 255 },
  { code: "C2", label: "Red", r: 200, g: 0, b: 0 },
];

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

    expect(nearestBeadColor({ r: 10, g: 0, b: 0 }, tiePalette)).toEqual(tiePalette[0]);
  });

  it("rejects empty palettes", () => {
    expect(() => nearestBeadColor({ r: 0, g: 0, b: 0 }, [])).toThrow("Palette must include at least one color.");
  });

  it("uses squared RGB distance", () => {
    expect(colorDistance({ r: 10, g: 20, b: 30 }, { r: 13, g: 24, b: 42 })).toBe(169);
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
      52,
    );

    expect(pattern.totalBeads).toBe(2);
    expect(pattern.usage).toHaveLength(2);
  });

  it.each(gridSizes)("builds complete %sx%s pattern totals from cells", (size) => {
    const cells = createSolidGrid(size, palette[0]);

    const pattern = cellsToPattern(cells, size);
    const usageTotal = pattern.usage.reduce((total, item) => total + item.count, 0);

    expect(pattern.totalBeads).toBe(size * size);
    expect(pattern.cells).toHaveLength(size * size);
    expect(usageTotal).toBe(pattern.totalBeads);
    expect(pattern.usage).toEqual([{ color: palette[0], count: size * size }]);
  });

  it("chooses readable text against light and dark colors", () => {
    expect(readableTextColor({ r: 250, g: 250, b: 250 })).toBe("#111111");
    expect(readableTextColor({ r: 20, g: 20, b: 20 })).toBe("#ffffff");
  });
});

describe("MARD mock palette contract", () => {
  it("keeps the mock palette within the MVP size range", () => {
    expect(mardPalette.length).toBeGreaterThanOrEqual(20);
    expect(mardPalette.length).toBeLessThanOrEqual(30);
  });

  it("uses unique color codes with valid RGB channels", () => {
    const codes = new Set<string>();

    for (const color of mardPalette) {
      codes.add(color.code);

      expect(color.code).toMatch(/^[A-Z][0-9]+$/);
      expect(color.label.length).toBeGreaterThan(0);
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
});

function createSolidGrid(size: GridSize, color: BeadColor): PatternCell[] {
  const cells: PatternCell[] = [];

  for (let y = 1; y <= size; y += 1) {
    for (let x = 1; x <= size; x += 1) {
      cells.push({ x, y, color });
    }
  }

  return cells;
}
