import type { BeadColor } from "./palette";

export type PatternDimensions = {
  width: number;
  height: number;
};

export type SourceImageSize = {
  width: number;
  height: number;
};

export type PatternCell = {
  x: number;
  y: number;
  color: BeadColor | null;
};

export type ColorUsage = {
  color: BeadColor;
  count: number;
};

export type Pattern = {
  width: number;
  height: number;
  cells: PatternCell[];
  usage: ColorUsage[];
  totalBeads: number;
};

export function summarizeCells(cells: PatternCell[]): ColorUsage[] {
  const counts = new Map<string, ColorUsage>();

  for (const cell of cells) {
    if (!cell.color) {
      continue;
    }
    const existing = counts.get(cell.color.code);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(cell.color.code, { color: cell.color, count: 1 });
    }
  }

  return sortColorUsage([...counts.values()]);
}

export function summarizeColors(colors: BeadColor[]): ColorUsage[] {
  const counts = new Map<string, ColorUsage>();

  for (const color of colors) {
    const existing = counts.get(color.code);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(color.code, { color, count: 1 });
    }
  }

  return sortColorUsage([...counts.values()]);
}

export function createPatternFromCells(cells: PatternCell[], dimensions: PatternDimensions): Pattern {
  const usage = summarizeCells(cells);

  return {
    width: dimensions.width,
    height: dimensions.height,
    cells,
    usage,
    totalBeads: colorUsageTotal(usage),
  };
}

function sortColorUsage(usage: ColorUsage[]): ColorUsage[] {
  return usage.sort((a, b) => b.count - a.count || a.color.code.localeCompare(b.color.code));
}

function colorUsageTotal(usage: ColorUsage[]): number {
  return usage.reduce((total, item) => total + item.count, 0);
}
