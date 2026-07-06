import { describe, expect, it } from "vitest";

import {
  clampPatternGridZoom,
  collectStrokeCellIndexes,
  cssAttributeString,
  nextKeyboardCellIndex,
  patternGridFocusRules,
  patternGridZoomMax,
  patternGridZoomMin,
} from "../src/pattern-grid-interaction";

describe("pattern grid interaction helpers", () => {
  it("clamps zoom to the supported range and rounds stable step increments", () => {
    expect(clampPatternGridZoom(0)).toBe(patternGridZoomMin);
    expect(clampPatternGridZoom(0.555)).toBe(0.56);
    expect(clampPatternGridZoom(1.2000000000000002)).toBe(1.2);
    expect(clampPatternGridZoom(9)).toBe(patternGridZoomMax);
  });

  it.each([
    [0, 0, 5, [0]],
    [0, 4, 5, [0, 1, 2, 3, 4]],
    [0, 20, 5, [0, 5, 10, 15, 20]],
    [4, 20, 5, [4, 8, 12, 16, 20]],
    [0, 24, 5, [0, 6, 12, 18, 24]],
    [24, 0, 5, [24, 18, 12, 6, 0]],
  ] as const)("interpolates stroke cells from %s to %s in a %s-wide grid", (previousCellIndex, cellIndex, patternWidth, expected) => {
    expect(collectStrokeCellIndexes(previousCellIndex, cellIndex, patternWidth)).toEqual(expected);
  });

  it.each([
    [-1, 4, 5],
    [0, 4, 0],
    [0.5, 4, 5],
  ])("rejects invalid stroke interpolation inputs", (previousCellIndex, cellIndex, patternWidth) => {
    expect(collectStrokeCellIndexes(previousCellIndex, cellIndex, patternWidth)).toEqual([]);
  });

  it.each([
    [0, "ArrowRight", 5, 25, 1],
    [4, "ArrowRight", 5, 25, 4],
    [4, "ArrowLeft", 5, 25, 3],
    [0, "ArrowLeft", 5, 25, 0],
    [2, "ArrowDown", 5, 25, 7],
    [22, "ArrowDown", 5, 25, 24],
    [7, "ArrowUp", 5, 25, 2],
    [2, "ArrowUp", 5, 25, 0],
    [12, "Home", 5, 25, 0],
    [12, "End", 5, 25, 24],
    [12, "Tab", 5, 25, null],
  ] as const)("maps keyboard key %s from cell %s to the next cell", (currentCellIndex, key, patternWidth, totalCells, expected) => {
    expect(nextKeyboardCellIndex(currentCellIndex, key, patternWidth, totalCells)).toBe(expected);
  });

  it("rejects keyboard movement when grid dimensions are invalid", () => {
    expect(nextKeyboardCellIndex(0, "ArrowRight", 0, 25)).toBeNull();
    expect(nextKeyboardCellIndex(0, "ArrowRight", 5, 0)).toBeNull();
    expect(nextKeyboardCellIndex(0.5, "ArrowRight", 5, 25)).toBeNull();
  });

  it("escapes focused color codes before writing CSS attribute selectors", () => {
    expect(cssAttributeString('A"1\\2\n3')).toBe('A\\"1\\\\2\\A 3');
    expect(patternGridFocusRules(['A"1\\2\n3'])).toContain('data-focused-color-code="A\\"1\\\\2\\A 3"');
  });
});
