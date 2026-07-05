import { describe, expect, it } from "vitest";

import type { BeadColor } from "../src/palette";
import { cellsToPattern, nearestBeadColor, readableTextColor, summarizeCells } from "../src/pattern";

const palette: BeadColor[] = [
  { code: "B1", label: "Black", r: 0, g: 0, b: 0 },
  { code: "A1", label: "White", r: 255, g: 255, b: 255 },
  { code: "C2", label: "Red", r: 200, g: 0, b: 0 },
];

describe("pattern logic", () => {
  it("matches sampled colors to the nearest bead color", () => {
    expect(nearestBeadColor({ r: 210, g: 15, b: 20 }, palette).code).toBe("C2");
    expect(nearestBeadColor({ r: 245, g: 246, b: 250 }, palette).code).toBe("A1");
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

  it("chooses readable text against light and dark colors", () => {
    expect(readableTextColor({ r: 250, g: 250, b: 250 })).toBe("#111111");
    expect(readableTextColor({ r: 20, g: 20, b: 20 })).toBe("#ffffff");
  });
});
