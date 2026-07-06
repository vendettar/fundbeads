import { describe, expect, it } from "vitest";

import { mardPalette, type BeadColor } from "../src/palette";
import { cellsToPattern, type Pattern, type PatternCell } from "../src/pattern";
import {
  createPatternEditState,
  erasePatternCell,
  erasePatternCells,
  getEffectivePattern,
  paintPatternCell,
  paintPatternCells,
  patternEditUndoLimit,
  redoPatternEdit,
  replacePatternColor,
  resetPatternEdits,
  setPatternEditActiveColor,
  setPatternEditTool,
  undoPatternEdit,
  type PatternEditState,
} from "../src/pattern-edit";

const colors = mardPalette.slice(0, 5) as BeadColor[];
const [baseA, baseB, baseC, paintD, paintE] = colors;
const testPatternWidth = 40;
const testPatternHeight = 40;
const testPatternTotal = testPatternWidth * testPatternHeight;

function createPattern(colorCodes: string[] = [baseA.code, baseB.code, baseC.code, baseA.code]): Pattern {
  const paddedCodes = [
    ...colorCodes,
    ...Array.from({ length: testPatternTotal - colorCodes.length }, () => baseB.code),
  ];
  const cells: PatternCell[] = paddedCodes.map((code, index) => {
    const color = colors.find((candidate) => candidate.code === code);
    if (!color) {
      throw new Error(`Missing test color ${code}`);
    }

    return {
      x: (index % testPatternWidth) + 1,
      y: Math.floor(index / testPatternWidth) + 1,
      color,
    };
  });

  return cellsToPattern(cells, { width: testPatternWidth, height: testPatternHeight });
}

function createPatternWithDimensions(width: number, height: number): Pattern {
  const cells = Array.from({ length: width * height }, (_, index) => ({
    x: (index % width) + 1,
    y: Math.floor(index / width) + 1,
    color: baseA,
  }));

  return {
    width,
    height,
    cells,
    usage: [{ color: baseA, count: cells.length }],
    totalBeads: cells.length,
  };
}

function effectiveCodes(pattern: Pattern) {
  return pattern.cells.map((cell) => cell.color.code);
}

function firstEffectiveCodes(pattern: Pattern, count = 4) {
  return effectiveCodes(pattern).slice(0, count);
}

describe("pattern edit helpers", () => {
  it("creates edit state from a generated pattern with a valid active color", () => {
    const basePattern = createPattern();

    const state = createPatternEditState(basePattern, colors);

    expect(state.basePattern).toBe(basePattern);
    expect(state.activeColorCode).toBe(baseA.code);
    expect(state.tool).toBe("view");
    expect(state.overrides).toEqual({});
    expect(state.undoStack).toEqual([]);
    expect(state.redoStack).toEqual([]);
    expect(getEffectivePattern(state, colors)).toMatchObject({
      width: testPatternWidth,
      height: testPatternHeight,
      totalBeads: testPatternTotal,
    });
  });

  it("rejects invalid active colors, override colors, override indexes, and corrupt base patterns", () => {
    const basePattern = createPattern();
    const corruptPattern = {
      ...basePattern,
      cells: basePattern.cells.slice(0, 3),
    };

    expect(() => createPatternEditState(basePattern, colors, { activeColorCode: "NOPE" })).toThrow("Unknown MARD color code");
    expect(() => createPatternEditState(basePattern, colors, { overrides: { 0: "NOPE" } })).toThrow("Unknown MARD color code");
    expect(() => createPatternEditState(basePattern, colors, { overrides: { [testPatternTotal]: paintD.code } })).toThrow("out of range");
    expect(() => createPatternEditState(corruptPattern, colors)).toThrow("complete row-major");
  });

  it("rejects generated base patterns with unknown colors or unsupported dimensions", () => {
    const basePattern = createPattern();
    const unknownColorPattern = {
      ...basePattern,
      cells: basePattern.cells.map((cell, index) =>
        index === 0
          ? {
              ...cell,
              color: { ...cell.color, code: "NOPE" },
            }
          : cell,
      ),
    };
    const tooNarrowPattern = createPatternWithDimensions(39, testPatternHeight);

    expect(() => createPatternEditState(unknownColorPattern, colors)).toThrow("Unknown MARD color code");
    expect(() => createPatternEditState(tooNarrowPattern, colors)).toThrow("supported dimensions");
  });

  it("paints cells, removes base-color overrides, and keeps effective pattern counts valid", () => {
    const basePattern = createPattern();
    const state = createPatternEditState(basePattern, colors);

    const painted = paintPatternCell(state, 1, paintD.code);
    expect(painted.overrides).toEqual({ 1: paintD.code });
    expect(firstEffectiveCodes(getEffectivePattern(painted, colors))).toEqual([baseA.code, paintD.code, baseC.code, baseA.code]);
    expect(getEffectivePattern(painted, colors).usage.find(({ color }) => color.code === paintD.code)?.count).toBe(1);

    const removed = paintPatternCell(painted, 1, baseB.code);
    expect(removed.overrides).toEqual({});
    expect(firstEffectiveCodes(getEffectivePattern(removed, colors))).toEqual([baseA.code, baseB.code, baseC.code, baseA.code]);
    expect(getEffectivePattern(removed, colors).totalBeads).toBe(testPatternTotal);
  });

  it("treats paint and erase no-ops as history-free and rejects invalid operations", () => {
    const state = createPatternEditState(createPattern(), colors);

    expect(paintPatternCell(state, 0, baseA.code)).toBe(state);
    expect(erasePatternCell(state, 0)).toBe(state);
    expect(() => paintPatternCell(state, -1, paintD.code)).toThrow("out of range");
    expect(() => paintPatternCell(state, testPatternTotal, paintD.code)).toThrow("out of range");
    expect(() => paintPatternCell(state, 0, "NOPE")).toThrow("Unknown MARD color code");
    expect(() => erasePatternCell(state, testPatternTotal)).toThrow("out of range");
  });

  it("updates active color and tool without changing pattern data or history", () => {
    const state = createPatternEditState(createPattern(), colors);

    const picked = setPatternEditActiveColor(state, paintD.code);
    const paintMode = setPatternEditTool(picked, "paint");

    expect(picked.activeColorCode).toBe(paintD.code);
    expect(paintMode.tool).toBe("paint");
    expect(getEffectivePattern(paintMode, colors)).toEqual(getEffectivePattern(state, colors));
    expect(paintMode.undoStack).toEqual([]);
  });

  it("erases painted cells by restoring generated colors without blank cells", () => {
    const state = createPatternEditState(createPattern(), colors);
    const painted = paintPatternCell(state, 2, paintD.code);
    const erased = erasePatternCell(painted, 2);
    const effective = getEffectivePattern(erased, colors);

    expect(erased.overrides).toEqual({});
    expect(firstEffectiveCodes(effective)).toEqual([baseA.code, baseB.code, baseC.code, baseA.code]);
    expect(effective.cells.every((cell) => Boolean(cell.color.code))).toBe(true);
    expect(effective.totalBeads).toBe(effective.width * effective.height);
  });

  it("replaces effective source colors across base and overridden cells", () => {
    const state = createPatternEditState(createPattern([baseA.code, baseB.code, baseC.code, baseA.code]), colors);
    const painted = paintPatternCell(state, 1, baseA.code);

    const replaced = replacePatternColor(painted, baseA.code, paintE.code);
    expect(firstEffectiveCodes(getEffectivePattern(replaced, colors))).toEqual([paintE.code, paintE.code, baseC.code, paintE.code]);
    expect(replaced.overrides).toEqual({ 0: paintE.code, 1: paintE.code, 3: paintE.code });

    const backToBase = replacePatternColor(replaced, paintE.code, baseB.code);
    expect(firstEffectiveCodes(getEffectivePattern(backToBase, colors))).toEqual([baseB.code, baseB.code, baseC.code, baseB.code]);
    expect(backToBase.overrides).toEqual({ 0: baseB.code, 3: baseB.code });
  });

  it("rejects unknown replace colors and treats equal or missing source colors as no-ops", () => {
    const state = createPatternEditState(createPattern(), colors);

    expect(replacePatternColor(state, baseA.code, baseA.code)).toBe(state);
    expect(replacePatternColor(state, paintE.code, paintD.code)).toBe(state);
    expect(() => replacePatternColor(state, "NOPE", paintD.code)).toThrow("Unknown MARD color code");
    expect(() => replacePatternColor(state, baseA.code, "NOPE")).toThrow("Unknown MARD color code");
  });

  it("keeps effective cells row-major with 1-based coordinates after edits", () => {
    const state = createPatternEditState(createPattern(), colors);
    const edited = paintPatternCells(state, [3, 0, 3, 1], paintD.code);

    expect(getEffectivePattern(edited, colors).cells.slice(0, 4).map(({ x, y }) => `${x},${y}`)).toEqual(["1,1", "2,1", "3,1", "4,1"]);
    expect(edited.undoStack).toHaveLength(1);
  });

  it("undoes and redoes paint strokes, erase strokes, replace, and reset", () => {
    const state = createPatternEditState(createPattern(), colors);
    const paintedStroke = paintPatternCells(state, [0, 1], paintD.code);
    const erasedStroke = erasePatternCells(paintedStroke, [1, 2]);
    const replaced = replacePatternColor(erasedStroke, paintD.code, paintE.code);
    const reset = resetPatternEdits(replaced);

    expect(firstEffectiveCodes(getEffectivePattern(reset, colors))).toEqual([baseA.code, baseB.code, baseC.code, baseA.code]);
    expect(reset.undoStack).toHaveLength(4);

    const undoReset = undoPatternEdit(reset);
    expect(firstEffectiveCodes(getEffectivePattern(undoReset, colors))).toEqual([paintE.code, baseB.code, baseC.code, baseA.code]);

    const undoReplace = undoPatternEdit(undoReset);
    expect(firstEffectiveCodes(getEffectivePattern(undoReplace, colors))).toEqual([paintD.code, baseB.code, baseC.code, baseA.code]);

    const redoReplace = redoPatternEdit(undoReplace);
    expect(firstEffectiveCodes(getEffectivePattern(redoReplace, colors))).toEqual([paintE.code, baseB.code, baseC.code, baseA.code]);
  });

  it("bounds undo history and clears redo after a new edit", () => {
    const state = createPatternEditState(createPattern(), colors);
    const edited = Array.from({ length: patternEditUndoLimit + 5 }).reduce<PatternEditState>(
      (currentState, _, index) => paintPatternCell(currentState, index, paintD.code),
      state,
    );
    const undone = undoPatternEdit(edited);
    const nextEdit = paintPatternCell(undone, 2, paintE.code);

    expect(edited.undoStack).toHaveLength(patternEditUndoLimit);
    expect(undone.redoStack).toHaveLength(1);
    expect(nextEdit.redoStack).toEqual([]);
  });

  it("reinitializes from a new generated pattern without stale overrides or history", () => {
    const first = createPatternEditState(createPattern(), colors);
    const edited = paintPatternCell(first, 0, paintD.code);
    const second = createPatternEditState(createPattern([paintE.code, paintE.code, paintE.code, paintE.code]), colors);

    expect(edited.overrides).toEqual({ 0: paintD.code });
    expect(second.overrides).toEqual({});
    expect(second.undoStack).toEqual([]);
    expect(firstEffectiveCodes(getEffectivePattern(second, colors))).toEqual([paintE.code, paintE.code, paintE.code, paintE.code]);
  });
});
