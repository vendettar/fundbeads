import { mard221Palette, mardPalette, type BeadColor } from "./palette";
import { cellsToPattern, patternDimensionMax, patternDimensionMin, patternOutputDimensionMin, type Pattern, type PatternCell } from "./pattern";
import { localPatternRecordVersion, type LocalPatternRecord, type LocalPatternRecordInput, type LocalPatternRecordMetadata, type LocalPatternUsage } from "./local-pattern-record";

const paletteByCode = new Map<string, BeadColor>(mardPalette.map((color) => [color.code, color]));

export function patternToLocalPatternRecordInput(pattern: Pattern, metadata: LocalPatternRecordMetadata): LocalPatternRecordInput {
  assertRowMajorPattern(pattern);
  const createdAt = metadata.createdAt ?? Date.now();
  const cellCodes = pattern.cells.map((cell) => cell.color?.code ?? null);

  return {
    id: metadata.id,
    createdAt,
    updatedAt: metadata.updatedAt ?? createdAt,
    title: metadata.title,
    sourceFileName: metadata.sourceFileName,
    width: pattern.width,
    height: pattern.height,
    paletteSlug: mard221Palette.slug,
    paletteVersion: mard221Palette.version,
    cellCodes,
    usage: pattern.usage.map(({ color, count }) => ({ code: color.code, count })),
    totalBeads: pattern.totalBeads,
    usedColorCount: pattern.usage.length,
    ownerScope: "anonymous-local",
    localRecordId: metadata.id,
    remoteRecordId: null,
    syncStatus: "local-only",
  };
}

export function isRowMajorPattern(pattern: Pattern): boolean {
  const expectedCells = pattern.width * pattern.height;
  if (pattern.cells.length !== expectedCells) {
    return false;
  }

  return pattern.cells.every((cell, index) => {
    const expectedX = (index % pattern.width) + 1;
    const expectedY = Math.floor(index / pattern.width) + 1;
    return cell.x === expectedX && cell.y === expectedY;
  });
}

export function assertRowMajorPattern(pattern: Pattern): void {
  if (!isRowMajorPattern(pattern)) {
    throw new Error("Local pattern records require a row-major pattern.");
  }
}

export function normalizeLocalPatternRecord(value: unknown): LocalPatternRecord | null {
  if (!isRecord(value) || "previewObjectUrl" in value) {
    return null;
  }

  const width = value.width;
  const height = value.height;
  if (!isSupportedOutputDimension(width) || !isSupportedOutputDimension(height) || Math.max(width, height) < patternDimensionMin) {
    return null;
  }

  const gridCellCount = width * height;
  if (
    typeof value.id !== "string" ||
    value.id.trim() === "" ||
    value.version !== localPatternRecordVersion ||
    !isSafeNonNegativeInteger(value.createdAt) ||
    !isSafeNonNegativeInteger(value.updatedAt) ||
    value.updatedAt < value.createdAt ||
    value.paletteSlug !== mard221Palette.slug ||
    value.paletteVersion !== mard221Palette.version ||
    !Array.isArray(value.cellCodes) ||
    value.cellCodes.length !== gridCellCount ||
    !Array.isArray(value.usage) ||
    !isSafeNonNegativeInteger(value.totalBeads) ||
    value.usedColorCount !== value.usage.length ||
    value.ownerScope !== "anonymous-local" ||
    typeof value.localRecordId !== "string" ||
    value.localRecordId.trim() === "" ||
    (value.remoteRecordId !== null && value.remoteRecordId !== undefined) ||
    value.syncStatus !== "local-only"
  ) {
    return null;
  }

  if (value.title !== undefined && typeof value.title !== "string") {
    return null;
  }
  if (value.sourceFileName !== undefined && typeof value.sourceFileName !== "string") {
    return null;
  }
  if (value.sourceImageSaved === true || value.sourceImageId !== undefined) {
    return null;
  }

  const histogram = new Map<string, number>();
  const normalizedCellCodes: Array<string | null> = [];
  for (const code of value.cellCodes) {
    if (code === null) {
      normalizedCellCodes.push(null);
      continue;
    }

    if (typeof code !== "string" || !paletteByCode.has(code)) {
      return null;
    }
    normalizedCellCodes.push(code);
    histogram.set(code, (histogram.get(code) ?? 0) + 1);
  }

  const totalBeads = [...histogram.values()].reduce((sum, count) => sum + count, 0);
  if (value.totalBeads !== totalBeads) {
    return null;
  }

  const normalizedUsage: LocalPatternUsage[] = [];
  const seenUsageCodes = new Set<string>();
  for (const item of value.usage) {
    if (!isRecord(item) || typeof item.code !== "string" || !isSafePositiveInteger(item.count) || !paletteByCode.has(item.code)) {
      return null;
    }
    if (seenUsageCodes.has(item.code) || histogram.get(item.code) !== item.count) {
      return null;
    }
    seenUsageCodes.add(item.code);
    normalizedUsage.push({ code: item.code, count: item.count });
  }

  if (seenUsageCodes.size !== histogram.size) {
    return null;
  }

  return {
    id: value.id,
    version: localPatternRecordVersion,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    title: value.title,
    sourceFileName: value.sourceFileName,
    width,
    height,
    paletteSlug: mard221Palette.slug,
    paletteVersion: mard221Palette.version,
    cellCodes: normalizedCellCodes,
    usage: normalizedUsage,
    totalBeads,
    usedColorCount: normalizedUsage.length,
    ownerScope: "anonymous-local",
    localRecordId: value.localRecordId,
    remoteRecordId: null,
    syncStatus: "local-only",
  };
}

export function localPatternRecordToPattern(record: LocalPatternRecord): Pattern {
  const cells: PatternCell[] = record.cellCodes.map((code, index) => {
    if (code === null) {
      return {
        x: (index % record.width) + 1,
        y: Math.floor(index / record.width) + 1,
        color: null,
      };
    }

    const color = paletteByCode.get(code);
    if (!color) {
      throw new Error(`Unknown MARD code in local pattern record: ${code}`);
    }

    return {
      x: (index % record.width) + 1,
      y: Math.floor(index / record.width) + 1,
      color,
    };
  });

  return cellsToPattern(cells, { width: record.width, height: record.height });
}

export function estimateLocalPatternRecordBytes(record: LocalPatternRecord): number {
  return new TextEncoder().encode(JSON.stringify(record)).byteLength;
}

function isSupportedOutputDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= patternOutputDimensionMin && value <= patternDimensionMax;
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
