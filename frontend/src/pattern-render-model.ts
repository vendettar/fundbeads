import type { Pattern, PatternCell } from "./pattern";
import { isPatternAxisLabelEmphasized, patternGuideLevel, type PatternGridGeometry, type PatternGuideLevel } from "./pattern-grid-geometry";

export type PatternCellRenderModel = {
  cell: PatternCell;
  cellIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xGuide: PatternGuideLevel;
  yGuide: PatternGuideLevel;
};

export type PatternRenderRowModel = {
  row: number;
  startCellIndex: number;
  cells: readonly PatternCellRenderModel[];
};

export type PatternAxisRenderCell = {
  label: number;
  x: number;
  y: number;
  width: number;
  height: number;
  major: boolean;
};

export type PatternGridRenderLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  guideLevel: PatternGuideLevel;
};

export type PatternRenderModel = {
  rows: readonly PatternRenderRowModel[];
  cells: readonly PatternCellRenderModel[];
  axisCells: readonly PatternAxisRenderCell[];
  gridLines: readonly PatternGridRenderLine[];
};

export function buildPatternRenderModel(pattern: Pattern, geometry: PatternGridGeometry, previousRows: readonly PatternRenderRowModel[] = []): PatternRenderModel {
  const rows = buildPatternRenderRows(pattern, geometry, previousRows);
  return {
    rows,
    cells: rows.flatMap((row) => row.cells),
    axisCells: buildPatternAxisCells(pattern, geometry),
    gridLines: buildPatternGridLines(pattern, geometry),
  };
}

export function buildPatternRenderRows(pattern: Pattern, geometry: PatternGridGeometry, previousRows: readonly PatternRenderRowModel[] = []): PatternRenderRowModel[] {
  return Array.from({ length: pattern.height }, (_, rowIndex) => {
    const row = rowIndex + 1;
    const startCellIndex = rowIndex * pattern.width;
    const cells = pattern.cells.slice(startCellIndex, startCellIndex + pattern.width).map((cell, cellOffset) => buildPatternCellRenderModel(cell, startCellIndex + cellOffset, geometry));
    const previousRow = previousRows[rowIndex];

    if (
      previousRow?.row === row &&
      previousRow.startCellIndex === startCellIndex &&
      patternRenderRowCellsEqual(previousRow.cells, cells)
    ) {
      return previousRow;
    }

    return { row, startCellIndex, cells };
  });
}

export function patternRenderRowCellsEqual(previousCells: readonly PatternCellRenderModel[], nextCells: readonly PatternCellRenderModel[]): boolean {
  if (previousCells.length !== nextCells.length) {
    return false;
  }

  for (let index = 0; index < previousCells.length; index += 1) {
    if (!patternRenderCellsEqual(previousCells[index], nextCells[index])) {
      return false;
    }
  }

  return true;
}

function buildPatternCellRenderModel(cell: PatternCell, cellIndex: number, geometry: PatternGridGeometry): PatternCellRenderModel {
  return {
    cell,
    cellIndex,
    x: geometry.originX + (cell.x - 1) * geometry.cellSize,
    y: geometry.originY + (cell.y - 1) * geometry.cellSize,
    width: geometry.cellSize,
    height: geometry.cellSize,
    xGuide: patternGuideLevel(cell.x),
    yGuide: patternGuideLevel(cell.y),
  };
}

function buildPatternAxisCells(pattern: Pattern, geometry: PatternGridGeometry): PatternAxisRenderCell[] {
  if (geometry.axisWidth === 0 || geometry.axisHeight === 0) {
    return [];
  }

  const cells: PatternAxisRenderCell[] = [];

  for (let column = 1; column <= pattern.width; column += 1) {
    const x = geometry.originX + (column - 1) * geometry.cellSize;
    const major = isPatternAxisLabelEmphasized(column);
    cells.push({ label: column, x, y: 0, width: geometry.cellSize, height: geometry.axisHeight, major });
    cells.push({ label: column, x, y: geometry.originY + geometry.gridHeight, width: geometry.cellSize, height: geometry.axisHeight, major });
  }

  for (let row = 1; row <= pattern.height; row += 1) {
    const y = geometry.originY + (row - 1) * geometry.cellSize;
    const major = isPatternAxisLabelEmphasized(row);
    cells.push({ label: row, x: 0, y, width: geometry.axisWidth, height: geometry.cellSize, major });
    cells.push({ label: row, x: geometry.originX + geometry.gridWidth, y, width: geometry.axisWidth, height: geometry.cellSize, major });
  }

  return cells;
}

function buildPatternGridLines(pattern: Pattern, geometry: PatternGridGeometry): PatternGridRenderLine[] {
  const lines: PatternGridRenderLine[] = [];

  for (let column = 0; column <= pattern.width; column += 1) {
    const x = geometry.originX + column * geometry.cellSize;
    lines.push({ x1: x, y1: geometry.originY, x2: x, y2: geometry.originY + geometry.gridHeight, guideLevel: patternGuideLevel(column) });
  }

  for (let row = 0; row <= pattern.height; row += 1) {
    const y = geometry.originY + row * geometry.cellSize;
    lines.push({ x1: geometry.originX, y1: y, x2: geometry.originX + geometry.gridWidth, y2: y, guideLevel: patternGuideLevel(row) });
  }

  return lines;
}

function patternRenderCellsEqual(previousModel: PatternCellRenderModel | undefined, nextModel: PatternCellRenderModel | undefined): boolean {
  if (!previousModel || !nextModel) {
    return previousModel === nextModel;
  }

  const previousCell = previousModel.cell;
  const nextCell = nextModel.cell;
  const previousColor = previousCell.color;
  const nextColor = nextCell.color;

  return (
    previousModel.cellIndex === nextModel.cellIndex &&
    previousModel.x === nextModel.x &&
    previousModel.y === nextModel.y &&
    previousModel.width === nextModel.width &&
    previousModel.height === nextModel.height &&
    previousModel.xGuide === nextModel.xGuide &&
    previousModel.yGuide === nextModel.yGuide &&
    previousCell.x === nextCell.x &&
    previousCell.y === nextCell.y &&
    previousColor?.code === nextColor?.code &&
    previousColor?.label === nextColor?.label &&
    previousColor?.r === nextColor?.r &&
    previousColor?.g === nextColor?.g &&
    previousColor?.b === nextColor?.b
  );
}
