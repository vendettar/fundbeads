import type { BeadColor, Rgb } from "./palette";
import { mardPalette } from "./palette";

export type GridSize = 52 | 64 | 78;

export type PatternCell = {
  x: number;
  y: number;
  color: BeadColor;
};

export type ColorUsage = {
  color: BeadColor;
  count: number;
};

export type Pattern = {
  size: GridSize;
  cells: PatternCell[];
  usage: ColorUsage[];
  totalBeads: number;
};

export const gridSizes: GridSize[] = [52, 64, 78];

export function colorDistance(a: Rgb, b: Rgb): number {
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return red * red + green * green + blue * blue;
}

export function compositeRgbOverWhite(color: Rgb, alpha: number): Rgb {
  return {
    r: Math.round(color.r * alpha + 255 * (1 - alpha)),
    g: Math.round(color.g * alpha + 255 * (1 - alpha)),
    b: Math.round(color.b * alpha + 255 * (1 - alpha)),
  };
}

export function nearestBeadColor(color: Rgb, palette: BeadColor[] = mardPalette): BeadColor {
  if (palette.length === 0) {
    throw new Error("Palette must include at least one color.");
  }

  return palette.reduce((closest, candidate) => {
    return colorDistance(color, candidate) < colorDistance(color, closest) ? candidate : closest;
  }, palette[0]);
}

export function readableTextColor(color: Rgb): "#111111" | "#ffffff" {
  const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
  return luminance > 0.58 ? "#111111" : "#ffffff";
}

export function summarizeCells(cells: PatternCell[]): ColorUsage[] {
  const counts = new Map<string, ColorUsage>();

  for (const cell of cells) {
    const existing = counts.get(cell.color.code);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(cell.color.code, { color: cell.color, count: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.color.code.localeCompare(b.color.code));
}

export function cellsToPattern(cells: PatternCell[], size: GridSize): Pattern {
  return {
    size,
    cells,
    usage: summarizeCells(cells),
    totalBeads: cells.length,
  };
}

export async function imageFileToPattern(file: File, size: GridSize): Promise<Pattern> {
  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Could not create canvas context.");
    }

    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, size, size);
    context.drawImage(bitmap, 0, 0, size, size);

    const pixels = context.getImageData(0, 0, size, size).data;
    const cells: PatternCell[] = [];

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        const alpha = pixels[offset + 3] / 255;
        const sampled = compositeRgbOverWhite({ r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] }, alpha);

        cells.push({
          x: x + 1,
          y: y + 1,
          color: nearestBeadColor(sampled),
        });
      }
    }

    return cellsToPattern(cells, size);
  } finally {
    bitmap.close();
  }
}
