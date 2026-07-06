import { describe, expect, it } from "vitest";

import type { BeadColor } from "../src/palette";
import type { Pattern, PatternCell } from "../src/pattern";
import { buildPatternGridRowModels, patternGridRowCellsRenderEqual } from "../src/pattern-grid-board";

const black: BeadColor = { code: "B1", label: "Black", r: 0, g: 0, b: 0 };
const white: BeadColor = { code: "A1", label: "White", r: 255, g: 255, b: 255 };

function createPattern(cells: PatternCell[], width: number, height = cells.length / width): Pattern {
  return {
    width,
    height,
    cells,
    usage: [],
    totalBeads: cells.filter((cell) => cell.color).length,
  };
}

function createCells(width: number, height: number): PatternCell[] {
  return Array.from({ length: width * height }, (_, index) => ({
    x: (index % width) + 1,
    y: Math.floor(index / width) + 1,
    color: index % 2 === 0 ? black : white,
  }));
}

describe("pattern grid row memoization helpers", () => {
  it("builds row-local models with stable row indexes and cell ranges", () => {
    const rows = buildPatternGridRowModels(createPattern(createCells(3, 2), 3));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ row: 1, startCellIndex: 0 });
    expect(rows[0].cells).toHaveLength(3);
    expect(rows[1]).toMatchObject({ row: 2, startCellIndex: 3 });
    expect(rows[1].cells).toHaveLength(3);
  });

  it("treats rows with the same rendered cell values as unchanged", () => {
    const cells = createCells(3, 2);
    const sameRenderedCells = cells.map((cell) => ({ ...cell, color: cell.color ? { ...cell.color } : null }));

    expect(patternGridRowCellsRenderEqual(cells, sameRenderedCells)).toBe(true);
  });

  it("reuses unchanged row models when one effective row changes", () => {
    const cells = createCells(3, 2);
    const previousRows = buildPatternGridRowModels(createPattern(cells, 3));
    const nextCells = [...cells];
    nextCells[3] = { ...nextCells[3], color: black };
    const nextRows = buildPatternGridRowModels(createPattern(nextCells, 3), previousRows);

    expect(nextRows[0]).toBe(previousRows[0]);
    expect(nextRows[1]).not.toBe(previousRows[1]);
  });

  it("reuses an already edited row when an unrelated row changes later", () => {
    const cells = createCells(3, 2);
    const firstEditCells = [...cells];
    firstEditCells[3] = { ...firstEditCells[3], color: black };
    const firstEditRows = buildPatternGridRowModels(createPattern(firstEditCells, 3));
    const secondEditCells = firstEditCells.map((cell, index) => (index === 3 ? { ...cell, color: { ...black } } : cell));
    secondEditCells[1] = { ...secondEditCells[1], color: black };
    const secondEditRows = buildPatternGridRowModels(createPattern(secondEditCells, 3), firstEditRows);

    expect(secondEditRows[0]).not.toBe(firstEditRows[0]);
    expect(secondEditRows[1]).toBe(firstEditRows[1]);
  });

  it("detects no-bead and dimension changes", () => {
    const cells = createCells(3, 2);
    const noBeadCells = [...cells];
    noBeadCells[0] = { ...noBeadCells[0], color: null };

    expect(patternGridRowCellsRenderEqual(cells.slice(0, 3), noBeadCells.slice(0, 3))).toBe(false);

    const previousRows = buildPatternGridRowModels(createPattern(cells, 3, 2));
    const nextRows = buildPatternGridRowModels(createPattern(cells, 2, 3), previousRows);

    expect(nextRows[0]).not.toBe(previousRows[0]);
  });
});
