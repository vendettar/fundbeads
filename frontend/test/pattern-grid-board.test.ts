import { describe, expect, it } from "vitest";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { I18nProvider } from "../src/i18n";
import type { BeadColor } from "../src/palette";
import type { Pattern, PatternCell } from "../src/pattern";
import { buildPatternGridRowModels, PatternGridBoard, patternGridRowCellsRenderEqual } from "../src/pattern-grid-board";
import { patternGridGeometry } from "../src/pattern-grid-geometry";
import type { PatternRenderRowModel } from "../src/pattern-render-model";

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

function geometryFor(pattern: Pattern) {
  return patternGridGeometry(pattern, { showAxes: true, cellSize: 22, axisWidth: 38, axisHeight: 22 });
}

function buildRows(pattern: Pattern, previousRows: readonly PatternRenderRowModel[] = []) {
  return buildPatternGridRowModels(pattern, geometryFor(pattern), previousRows);
}

function renderBoardWithEditedAwayPaintMarker(showCodes: boolean) {
  const pattern = createPattern([{ x: 1, y: 1, color: black }], 1);
  const geometry = patternGridGeometry(pattern, { showAxes: false, cellSize: 22, axisWidth: 38, axisHeight: 22 });
  const noop = () => undefined;

  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      null,
      createElement(PatternGridBoard, {
        pattern,
        previewOptions: { showAxes: false, showCodes, showGrid: true },
        xLabels: [1],
        gridRef: createRef<HTMLDivElement>(),
        viewportRef: createRef<HTMLDivElement>(),
        cellIdPrefix: "test-grid",
        activeCellId: "test-grid-cell-0",
        geometry,
        scaledWidth: geometry.totalWidth,
        scaledHeight: geometry.totalHeight,
        effectiveScale: 1,
        editTool: "view",
        isPanning: false,
        colorFocusEditedAwayCellMarkers: new Map([[0, { type: "paint" as const, colorCode: white.code, colorCss: "rgb(255 255 255)", colorFgCss: "rgb(0 0 0)" }]]),
        onPointerDown: noop,
        onPointerMove: noop,
        onPointerUp: noop,
        onPointerLeave: noop,
        onPointerCancel: noop,
        onFocus: noop,
        onKeyDown: noop,
      }),
    ),
  );
}

describe("pattern grid row memoization helpers", () => {
  it("builds row-local models with stable row indexes and cell ranges", () => {
    const rows = buildRows(createPattern(createCells(3, 2), 3));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ row: 1, startCellIndex: 0 });
    expect(rows[0].cells).toHaveLength(3);
    expect(rows[1]).toMatchObject({ row: 2, startCellIndex: 3 });
    expect(rows[1].cells).toHaveLength(3);
  });

  it("treats rows with the same rendered cell values as unchanged", () => {
    const cells = createCells(3, 2);
    const sameRenderedCells = cells.map((cell) => ({ ...cell, color: cell.color ? { ...cell.color } : null }));
    const previousRows = buildRows(createPattern(cells, 3));
    const nextRows = buildRows(createPattern(sameRenderedCells, 3));

    expect(patternGridRowCellsRenderEqual(previousRows[0].cells, nextRows[0].cells)).toBe(true);
  });

  it("reuses unchanged row models when one effective row changes", () => {
    const cells = createCells(3, 2);
    const previousRows = buildRows(createPattern(cells, 3));
    const nextCells = [...cells];
    nextCells[3] = { ...nextCells[3], color: black };
    const nextRows = buildRows(createPattern(nextCells, 3), previousRows);

    expect(nextRows[0]).toBe(previousRows[0]);
    expect(nextRows[1]).not.toBe(previousRows[1]);
  });

  it("reuses an already edited row when an unrelated row changes later", () => {
    const cells = createCells(3, 2);
    const firstEditCells = [...cells];
    firstEditCells[3] = { ...firstEditCells[3], color: black };
    const firstEditRows = buildRows(createPattern(firstEditCells, 3));
    const secondEditCells = firstEditCells.map((cell, index) => (index === 3 ? { ...cell, color: { ...black } } : cell));
    secondEditCells[1] = { ...secondEditCells[1], color: black };
    const secondEditRows = buildRows(createPattern(secondEditCells, 3), firstEditRows);

    expect(secondEditRows[0]).not.toBe(firstEditRows[0]);
    expect(secondEditRows[1]).toBe(firstEditRows[1]);
  });

  it("detects no-bead and dimension changes", () => {
    const cells = createCells(3, 2);
    const noBeadCells = [...cells];
    noBeadCells[0] = { ...noBeadCells[0], color: null };
    const previousComparableRows = buildRows(createPattern(cells, 3));
    const noBeadComparableRows = buildRows(createPattern(noBeadCells, 3));

    expect(patternGridRowCellsRenderEqual(previousComparableRows[0].cells, noBeadComparableRows[0].cells)).toBe(false);

    const previousRows = buildRows(createPattern(cells, 3, 2));
    const nextRows = buildRows(createPattern(cells, 2, 3), previousRows);

    expect(nextRows[0]).not.toBe(previousRows[0]);
  });

  it("keeps 100x100 row-model churn bounded to the changed row", () => {
    const cells = createCells(100, 100);
    const previousRows = buildRows(createPattern(cells, 100));
    const nextCells = [...cells];
    nextCells[4_242] = { ...nextCells[4_242], color: null };
    const nextRows = buildRows(createPattern(nextCells, 100), previousRows);
    const reusedRows = nextRows.filter((row, index) => row === previousRows[index]);

    expect(previousRows).toHaveLength(100);
    expect(nextRows).toHaveLength(100);
    expect(reusedRows).toHaveLength(99);
    expect(nextRows[42]).not.toBe(previousRows[42]);
  });

  it("hides edited-away paint marker codes when pattern codes are hidden", () => {
    expect(renderBoardWithEditedAwayPaintMarker(false)).not.toContain(`data-color-focus-edited-away-code="${white.code}"`);
    expect(renderBoardWithEditedAwayPaintMarker(true)).toContain(`data-color-focus-edited-away-code="${white.code}"`);
  });
});
