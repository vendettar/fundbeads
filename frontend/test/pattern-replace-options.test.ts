import { describe, expect, it } from "vitest";

import { mard221Palette, mardPalette, type BeadColor } from "../src/palette";
import { getPatternReplaceColorGroups, getPatternReplaceSourceColors, getPatternReplaceTargetColors, getValidPatternReplaceTargetCode } from "../src/pattern-replace-options";
import type { ColorUsage } from "../src/pattern-model";

const colorA: BeadColor = { code: "A1", label: "A", r: 1, g: 2, b: 3 };
const colorB: BeadColor = { code: "B1", label: "B", r: 4, g: 5, b: 6 };
const colorC: BeadColor = { code: "C1", label: "C", r: 7, g: 8, b: 9 };

describe("pattern replace option helpers", () => {
  it("uses only colors that currently exist in the pattern as source colors", () => {
    const usage: ColorUsage[] = [
      { color: colorB, count: 4 },
      { color: colorA, count: 2 },
    ];

    expect(getPatternReplaceSourceColors(usage)).toEqual([colorB, colorA]);
  });

  it("limits replace source colors to the pinned color when a color pin is active", () => {
    const usage: ColorUsage[] = [
      { color: colorB, count: 4 },
      { color: colorA, count: 2 },
    ];
    const getSourceColors = getPatternReplaceSourceColors as (sourceUsage: readonly ColorUsage[], pinnedColorCode?: string | null) => BeadColor[];

    expect(getSourceColors(usage, colorA.code)).toEqual([colorA]);
    expect(getSourceColors(usage, "Z9")).toEqual([]);
    expect(getSourceColors(usage, null)).toEqual([colorB, colorA]);
  });

  it("uses all MARD colors except the selected source color as target colors", () => {
    const sourceCode = mardPalette[0].code;
    const targets = getPatternReplaceTargetColors(mardPalette, sourceCode);

    expect(mardPalette).toHaveLength(221);
    expect(targets).toHaveLength(220);
    expect(targets.map((color) => color.code)).not.toContain(sourceCode);
  });

  it("groups replace color options by MARD family order", () => {
    const groups = getPatternReplaceColorGroups([mardPalette[32], mardPalette[0], mardPalette[220], mardPalette[1]], mard221Palette.groups);

    expect(groups.map((group) => group.family)).toEqual(["A", "B", "M"]);
    expect(groups.map((group) => group.colors.map((color) => color.code))).toEqual([["A1", "A2"], ["B7"], ["M15"]]);
  });

  it("keeps a valid target and replaces a target that equals the source", () => {
    expect(getValidPatternReplaceTargetCode([colorA, colorB, colorC], colorA.code, colorB.code)).toBe(colorB.code);
    expect(getValidPatternReplaceTargetCode([colorA, colorB, colorC], colorA.code, colorA.code)).toBe(colorB.code);
  });
});
