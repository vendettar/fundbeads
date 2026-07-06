import { describe, expect, it } from "vitest";

import { axisLabels, defaultPatternPreviewOptions, isPatternAxisLabelEmphasized, patternGridGeometry, patternGuideLevel } from "../src/pattern-grid-geometry";

describe("pattern grid geometry", () => {
  it("keeps preview toggles enabled by default", () => {
    expect(defaultPatternPreviewOptions).toEqual({
      showGrid: true,
      showCodes: true,
      showAxes: true,
    });
  });

  it("builds 1-based axis labels", () => {
    expect(axisLabels(0)).toEqual([]);
    expect(axisLabels(5)).toEqual([1, 2, 3, 4, 5]);
  });

  it.each([
    [0, "base", false],
    [1, "base", false],
    [5, "minor", true],
    [10, "major", true],
    [15, "minor", true],
    [20, "major", true],
  ] as const)("classifies guide position %s as %s", (position, level, emphasized) => {
    expect(patternGuideLevel(position)).toBe(level);
    expect(isPatternAxisLabelEmphasized(position)).toBe(emphasized);
  });

  it("calculates total grid bounds and CSS columns with axes", () => {
    expect(patternGridGeometry({ width: 10, height: 5 }, { showAxes: true, cellSize: 22, axisWidth: 38, axisHeight: 22 })).toEqual({
      cellSize: 22,
      axisWidth: 38,
      axisHeight: 22,
      gridWidth: 220,
      gridHeight: 110,
      totalWidth: 296,
      totalHeight: 154,
      originX: 38,
      originY: 22,
      columns: "38px repeat(10, 22px) 38px",
    });
  });

  it("collapses axis bounds when axes are hidden", () => {
    expect(patternGridGeometry({ width: 2, height: 3 }, { showAxes: false, cellSize: 21.5, axisWidth: 38, axisHeight: 22 })).toMatchObject({
      cellSize: 22,
      axisWidth: 0,
      axisHeight: 0,
      gridWidth: 44,
      gridHeight: 66,
      totalWidth: 44,
      totalHeight: 66,
      originX: 0,
      originY: 0,
      columns: "repeat(2, 22px)",
    });
  });
});
