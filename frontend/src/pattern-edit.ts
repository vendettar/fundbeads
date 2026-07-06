import { mardPalette, type BeadColor } from "./palette";
import { cellsToPattern, patternDimensionMax, patternDimensionMin, type Pattern, type PatternCell } from "./pattern";

export const patternEditUndoLimit = 50;

export type PatternEditTool = "view" | "paint" | "pick" | "erase" | "replace";

export type PatternEditOverrideMap = Record<number, string>;

type PatternEditOverrideValue = string | null;

export type PatternEditTransaction = {
  before: Record<number, PatternEditOverrideValue>;
  after: Record<number, PatternEditOverrideValue>;
};

export type PatternEditState = {
  basePattern: Pattern;
  activeColorCode: string;
  tool: PatternEditTool;
  overrides: PatternEditOverrideMap;
  undoStack: PatternEditTransaction[];
  redoStack: PatternEditTransaction[];
};

type PatternEditStateOptions = {
  activeColorCode?: string;
  tool?: PatternEditTool;
  overrides?: PatternEditOverrideMap;
  undoStack?: PatternEditTransaction[];
  redoStack?: PatternEditTransaction[];
};

export function createPatternEditState(basePattern: Pattern, palette: BeadColor[], options: PatternEditStateOptions = {}): PatternEditState {
  const colorByCode = createColorMap(palette);
  validateBasePattern(basePattern, colorByCode);
  const activeColorCode = options.activeColorCode ?? basePattern.cells[0]?.color.code ?? palette[0]?.code;
  assertKnownColor(activeColorCode, colorByCode);

  return {
    basePattern,
    activeColorCode,
    tool: options.tool ?? "view",
    overrides: normalizeOverrides(basePattern, colorByCode, options.overrides ?? {}),
    undoStack: options.undoStack ?? [],
    redoStack: options.redoStack ?? [],
  };
}

export function getEffectivePattern(editState: PatternEditState, palette: BeadColor[]): Pattern {
  const colorByCode = createColorMap(palette);
  validateBasePattern(editState.basePattern, colorByCode);
  const overrides = normalizeOverrides(editState.basePattern, colorByCode, editState.overrides);
  const cells: PatternCell[] = editState.basePattern.cells.map((cell, index) => {
    const overrideCode = overrides[index];
    if (!overrideCode) {
      return cell;
    }
    return {
      ...cell,
      color: assertKnownColor(overrideCode, colorByCode),
    };
  });

  return cellsToPattern(cells, { width: editState.basePattern.width, height: editState.basePattern.height });
}

export function setPatternEditActiveColor(editState: PatternEditState, colorCode: string, palette: BeadColor[] = mardPalette): PatternEditState {
  const colorByCode = createColorMap(palette);
  assertKnownColor(colorCode, colorByCode);
  if (editState.activeColorCode === colorCode) {
    return editState;
  }
  return { ...editState, activeColorCode: colorCode };
}

export function setPatternEditTool(editState: PatternEditState, tool: PatternEditTool): PatternEditState {
  if (editState.tool === tool) {
    return editState;
  }
  return { ...editState, tool };
}

export function paintPatternCell(editState: PatternEditState, cellIndex: number, colorCode: string, palette: BeadColor[] = mardPalette): PatternEditState {
  return paintPatternCells(editState, [cellIndex], colorCode, palette);
}

export function paintPatternCells(editState: PatternEditState, cellIndexes: number[], colorCode: string, palette: BeadColor[] = mardPalette): PatternEditState {
  const colorByCode = createColorMap(palette);
  validateBasePattern(editState.basePattern, colorByCode);
  assertKnownColor(colorCode, colorByCode);

  return applyCellOverrides(editState, uniqueIndexes(cellIndexes), (index, currentOverride) => {
    assertCellIndex(editState.basePattern, index);
    const baseCode = editState.basePattern.cells[index].color.code;
    const effectiveCode = currentOverride ?? baseCode;
    if (effectiveCode === colorCode) {
      return currentOverride;
    }
    return colorCode === baseCode ? null : colorCode;
  });
}

export function erasePatternCell(editState: PatternEditState, cellIndex: number, palette: BeadColor[] = mardPalette): PatternEditState {
  return erasePatternCells(editState, [cellIndex], palette);
}

export function erasePatternCells(editState: PatternEditState, cellIndexes: number[], palette: BeadColor[] = mardPalette): PatternEditState {
  const colorByCode = createColorMap(palette);
  validateBasePattern(editState.basePattern, colorByCode);

  return applyCellOverrides(editState, uniqueIndexes(cellIndexes), (index, currentOverride) => {
    assertCellIndex(editState.basePattern, index);
    return currentOverride === undefined ? currentOverride : null;
  });
}

export function replacePatternColor(editState: PatternEditState, fromCode: string, toCode: string, palette: BeadColor[] = mardPalette): PatternEditState {
  const colorByCode = createColorMap(palette);
  validateBasePattern(editState.basePattern, colorByCode);
  assertKnownColor(fromCode, colorByCode);
  assertKnownColor(toCode, colorByCode);

  if (fromCode === toCode) {
    return editState;
  }

  return applyCellOverrides(
    editState,
    editState.basePattern.cells.map((_, index) => index),
    (index, currentOverride) => {
      const baseCode = editState.basePattern.cells[index].color.code;
      const effectiveCode = currentOverride ?? baseCode;
      if (effectiveCode !== fromCode) {
        return currentOverride;
      }
      return toCode === baseCode ? null : toCode;
    },
  );
}

export function resetPatternEdits(editState: PatternEditState): PatternEditState {
  const changedIndexes = Object.keys(editState.overrides).map(Number);
  if (changedIndexes.length === 0) {
    return editState;
  }

  return applyCellOverrides(editState, changedIndexes, () => null);
}

export function undoPatternEdit(editState: PatternEditState): PatternEditState {
  const transaction = editState.undoStack.at(-1);
  if (!transaction) {
    return editState;
  }

  return {
    ...editState,
    overrides: applyTransactionValues(editState.overrides, transaction.before),
    undoStack: editState.undoStack.slice(0, -1),
    redoStack: [...editState.redoStack, transaction],
  };
}

export function redoPatternEdit(editState: PatternEditState): PatternEditState {
  const transaction = editState.redoStack.at(-1);
  if (!transaction) {
    return editState;
  }

  return {
    ...editState,
    overrides: applyTransactionValues(editState.overrides, transaction.after),
    undoStack: trimUndoStack([...editState.undoStack, transaction]),
    redoStack: editState.redoStack.slice(0, -1),
  };
}

function applyCellOverrides(editState: PatternEditState, cellIndexes: number[], nextValueForIndex: (cellIndex: number, currentOverride: string | undefined) => string | null | undefined): PatternEditState {
  const nextOverrides = { ...editState.overrides };
  const before: Record<number, PatternEditOverrideValue> = {};
  const after: Record<number, PatternEditOverrideValue> = {};

  for (const index of cellIndexes) {
    const currentOverride = nextOverrides[index];
    const nextOverride = nextValueForIndex(index, currentOverride);
    if (nextOverride === currentOverride) {
      continue;
    }

    before[index] = currentOverride ?? null;
    if (nextOverride === null || nextOverride === undefined) {
      delete nextOverrides[index];
      after[index] = null;
    } else {
      nextOverrides[index] = nextOverride;
      after[index] = nextOverride;
    }
  }

  if (Object.keys(after).length === 0) {
    return editState;
  }

  return {
    ...editState,
    overrides: nextOverrides,
    undoStack: trimUndoStack([...editState.undoStack, { before, after }]),
    redoStack: [],
  };
}

function applyTransactionValues(overrides: PatternEditOverrideMap, values: Record<number, PatternEditOverrideValue>): PatternEditOverrideMap {
  const nextOverrides = { ...overrides };

  for (const [indexKey, colorCode] of Object.entries(values)) {
    const index = Number(indexKey);
    if (colorCode === null) {
      delete nextOverrides[index];
    } else {
      nextOverrides[index] = colorCode;
    }
  }

  return nextOverrides;
}

function normalizeOverrides(basePattern: Pattern, colorByCode: Map<string, BeadColor>, overrides: PatternEditOverrideMap): PatternEditOverrideMap {
  const normalized: PatternEditOverrideMap = {};

  for (const [indexKey, colorCode] of Object.entries(overrides)) {
    const index = Number(indexKey);
    assertCellIndex(basePattern, index);
    assertKnownColor(colorCode, colorByCode);
    if (basePattern.cells[index].color.code !== colorCode) {
      normalized[index] = colorCode;
    }
  }

  return normalized;
}

function validateBasePattern(pattern: Pattern, colorByCode?: Map<string, BeadColor>) {
  if (
    !Number.isInteger(pattern.width) ||
    !Number.isInteger(pattern.height) ||
    pattern.width < patternDimensionMin ||
    pattern.width > patternDimensionMax ||
    pattern.height < patternDimensionMin ||
    pattern.height > patternDimensionMax
  ) {
    throw new Error(`Pattern edit state requires supported dimensions between ${patternDimensionMin} and ${patternDimensionMax}.`);
  }

  const expectedCells = pattern.width * pattern.height;
  if (pattern.cells.length !== expectedCells || pattern.totalBeads !== expectedCells) {
    throw new Error("Pattern edit state requires a complete row-major base pattern.");
  }

  pattern.cells.forEach((cell, index) => {
    const expectedX = (index % pattern.width) + 1;
    const expectedY = Math.floor(index / pattern.width) + 1;
    if (cell.x !== expectedX || cell.y !== expectedY || !cell.color.code) {
      throw new Error("Pattern edit state requires a complete row-major base pattern.");
    }
    if (colorByCode) {
      assertKnownColor(cell.color.code, colorByCode);
    }
  });
}

function assertCellIndex(pattern: Pattern, cellIndex: number) {
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= pattern.cells.length) {
    throw new Error(`Pattern edit cell index ${cellIndex} is out of range.`);
  }
}

function assertKnownColor(colorCode: string, colorByCode: Map<string, BeadColor>): BeadColor {
  const color = colorByCode.get(colorCode);
  if (!color) {
    throw new Error(`Unknown MARD color code: ${colorCode}`);
  }
  return color;
}

function createColorMap(palette: BeadColor[]): Map<string, BeadColor> {
  if (palette.length === 0) {
    throw new Error("Pattern editing requires at least one palette color.");
  }
  return new Map(palette.map((color) => [color.code, color]));
}

function uniqueIndexes(cellIndexes: number[]) {
  return [...new Set(cellIndexes)];
}

function trimUndoStack(undoStack: PatternEditTransaction[]) {
  return undoStack.slice(Math.max(0, undoStack.length - patternEditUndoLimit));
}
