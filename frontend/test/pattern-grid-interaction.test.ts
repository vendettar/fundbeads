import { describe, expect, it } from "vitest";

import {
  buildPatternGridColorCellIndex,
  canPanPatternGrid,
  clampPatternGridZoom,
  collectStrokeCellIndexes,
  nextPatternGridPanScroll,
  nextKeyboardCellIndex,
  previewPatternGridStroke,
  patternGridReplaceReturnTool,
  patternGridToolAfterReplaceClose,
  patternGridCellCanEdit,
  patternGridColorFocusEditedAwayMarkerChanges,
  patternGridColorFocusClassChanges,
  patternGridZoomMax,
  patternGridZoomMin,
} from "../src/pattern-grid-interaction";
import { createPatternFromCells, type Pattern } from "../src/pattern-model";
import type { BeadColor } from "../src/palette";

const colorA: BeadColor = { code: "A1", label: "A", r: 10, g: 20, b: 30 };
const colorB: BeadColor = { code: "B1", label: "B", r: 40, g: 50, b: 60 };

function makePreviewPattern(): Pattern {
  return createPatternFromCells(
    [
      { x: 1, y: 1, color: colorA },
      { x: 2, y: 1, color: colorA },
      { x: 3, y: 1, color: colorA },
      { x: 4, y: 1, color: colorA },
      { x: 5, y: 1, color: colorA },
    ],
    { width: 5, height: 1 },
  );
}

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

  it("builds a color-to-cell index for focused color previews", () => {
    const colorCellIndex = buildPatternGridColorCellIndex([
      { colorCode: "A1", item: 0 },
      { colorCode: "B1", item: 1 },
      { colorCode: "A1", item: 2 },
      { colorCode: null, item: 3 },
      { colorCode: undefined, item: 4 },
    ]);

    expect(colorCellIndex.get("A1")).toEqual([0, 2]);
    expect(colorCellIndex.get("B1")).toEqual([1]);
    expect(colorCellIndex.has("")).toBe(false);
  });

  it("calculates focused color class changes without clearing the whole grid", () => {
    const colorCellIndex = buildPatternGridColorCellIndex([
      { colorCode: "A1", item: 0 },
      { colorCode: "B1", item: 1 },
      { colorCode: "A1", item: 2 },
    ]);

    expect(patternGridColorFocusClassChanges(null, "A1", colorCellIndex)).toEqual({
      addItems: [0, 2],
      removeItems: [],
      isActive: true,
    });
    expect(patternGridColorFocusClassChanges("A1", "B1", colorCellIndex)).toEqual({
      addItems: [1],
      removeItems: [0, 2],
      isActive: true,
    });
    expect(patternGridColorFocusClassChanges("A1", "A1", colorCellIndex)).toEqual({
      addItems: [],
      removeItems: [],
      isActive: true,
    });
    expect(patternGridColorFocusClassChanges("A1", null, colorCellIndex)).toEqual({
      addItems: [],
      removeItems: [0, 2],
      isActive: false,
    });
  });

  it("can force focused color classes to be reapplied after preview className rewrites", () => {
    const colorCellIndex = buildPatternGridColorCellIndex([
      { colorCode: "A1", item: 0 },
      { colorCode: "B1", item: 1 },
      { colorCode: "A1", item: 2 },
    ]);

    expect(patternGridColorFocusClassChanges("A1", "A1", colorCellIndex, { force: true })).toEqual({
      addItems: [0, 2],
      removeItems: [],
      isActive: true,
    });
  });

  it("allows editing only visible cells while a grid color focus is active", () => {
    expect(patternGridCellCanEdit("A1", null)).toBe(true);
    expect(patternGridCellCanEdit(null, null)).toBe(true);
    expect(patternGridCellCanEdit("A1", "A1")).toBe(true);
    expect(patternGridCellCanEdit("B1", "A1")).toBe(false);
    expect(patternGridCellCanEdit(null, "A1")).toBe(false);
  });

  it("treats replace as a transient panel state that restores the prior tool", () => {
    expect(patternGridReplaceReturnTool("view", "paint")).toBe("view");
    expect(patternGridReplaceReturnTool("paint", "view")).toBe("paint");
    expect(patternGridReplaceReturnTool("pick", "view")).toBe("pick");
    expect(patternGridReplaceReturnTool("erase", "view")).toBe("erase");
    expect(patternGridReplaceReturnTool("replace", "erase")).toBe("erase");

    expect(patternGridToolAfterReplaceClose("replace", "view")).toBe("view");
    expect(patternGridToolAfterReplaceClose("replace", "paint")).toBe("paint");
    expect(patternGridToolAfterReplaceClose("erase", "paint")).toBe("erase");
  });

  it("builds an immediate paint or erase stroke preview without mutating the committed pattern", () => {
    const pattern = makePreviewPattern();
    const paintedPreview = previewPatternGridStroke(pattern, [0, 1, 2], "paint", colorB);

    expect(pattern.cells.map((cell) => cell.color?.code)).toEqual(["A1", "A1", "A1", "A1", "A1"]);
    expect(paintedPreview.cells.map((cell) => cell.color?.code)).toEqual(["B1", "B1", "B1", "A1", "A1"]);
    expect(paintedPreview.usage.map(({ color, count }) => [color.code, count])).toEqual([
      ["B1", 3],
      ["A1", 2],
    ]);

    const erasedPreview = previewPatternGridStroke(pattern, [1, 3], "erase", colorB);

    expect(erasedPreview.cells.map((cell) => cell.color?.code ?? null)).toEqual(["A1", null, "A1", null, "A1"]);
    expect(erasedPreview.totalBeads).toBe(3);
    expect(previewPatternGridStroke(pattern, [], "paint", colorB)).toBe(pattern);
  });

  it("returns typed edited-away markers for visible pinned cells", () => {
    const editedCells = [
      { cellIndex: 0, colorCode: "A1" },
      { cellIndex: 1, colorCode: "B1" },
      { cellIndex: 2, colorCode: "A1" },
      { cellIndex: 3, colorCode: null },
    ];

    expect(patternGridColorFocusEditedAwayMarkerChanges(editedCells, null, "B1")).toEqual({
      addMarkers: [],
      removeIndexes: [],
    });
    expect(patternGridColorFocusEditedAwayMarkerChanges(editedCells, "A1", "B1")).toEqual({
      addMarkers: [
        { cellIndex: 0, marker: { type: "paint", colorCode: "B1" } },
        { cellIndex: 2, marker: { type: "paint", colorCode: "B1" } },
      ],
      removeIndexes: [],
    });
    expect(patternGridColorFocusEditedAwayMarkerChanges(editedCells, "A1", null)).toEqual({
      addMarkers: [
        { cellIndex: 0, marker: { type: "erase" } },
        { cellIndex: 2, marker: { type: "erase" } },
      ],
      removeIndexes: [],
    });
    expect(patternGridColorFocusEditedAwayMarkerChanges(editedCells, "A1", "A1")).toEqual({
      addMarkers: [],
      removeIndexes: [0, 2],
    });
  });

  it("enables view-mode panning only when the grid viewport can scroll", () => {
    expect(canPanPatternGrid({ scrollWidth: 1200, clientWidth: 800, scrollHeight: 600, clientHeight: 600 })).toBe(true);
    expect(canPanPatternGrid({ scrollWidth: 800, clientWidth: 800, scrollHeight: 900, clientHeight: 600 })).toBe(true);
    expect(canPanPatternGrid({ scrollWidth: 800, clientWidth: 800, scrollHeight: 600, clientHeight: 600 })).toBe(false);
    expect(canPanPatternGrid({ scrollWidth: Number.NaN, clientWidth: 800, scrollHeight: 600, clientHeight: 600 })).toBe(false);
  });

  it("maps pointer drag deltas to clamped viewport scroll positions", () => {
    const start = { clientX: 100, clientY: 80, scrollLeft: 40, scrollTop: 20 };
    const metrics = { scrollWidth: 1200, clientWidth: 800, scrollHeight: 1000, clientHeight: 600 };

    expect(nextPatternGridPanScroll(start, { clientX: 70, clientY: 50 }, metrics)).toEqual({ scrollLeft: 70, scrollTop: 50 });
    expect(nextPatternGridPanScroll(start, { clientX: 300, clientY: 260 }, metrics)).toEqual({ scrollLeft: 0, scrollTop: 0 });
    expect(nextPatternGridPanScroll(start, { clientX: -800, clientY: -800 }, metrics)).toEqual({ scrollLeft: 400, scrollTop: 400 });
  });
});
