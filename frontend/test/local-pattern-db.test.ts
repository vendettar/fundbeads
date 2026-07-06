import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mard221Palette, mardPalette, type BeadColor } from "../src/palette";
import { cellsToPattern, type Pattern, type PatternDimensions, type PatternCell } from "../src/pattern";
import { createPatternEditState, getEffectivePattern, paintPatternCell, replacePatternColor } from "../src/pattern-edit";
import {
  assertCompleteCodedPattern,
  canUseLocalPatternDb,
  clearLocalPatternRecords,
  deleteLocalPatternDatabaseForTests,
  deleteLocalPatternRecord,
  estimateLocalPatternRecordBytes,
  isCompleteCodedPattern,
  listLocalPatternRecords,
  localPatternDbName,
  localPatternDbVersion,
  localPatternRecordVersion,
  localPatternRecordToPattern,
  maxLocalPatternRecords,
  normalizeLocalPatternRecord,
  patternToLocalPatternRecordInput,
  readLocalPatternRecord,
  saveLocalPatternRecord,
} from "../src/local-pattern-db";

const dimensions: PatternDimensions = { width: 40, height: 41 };
const totalBeads = dimensions.width * dimensions.height;

function createSolidPattern(color: BeadColor = mardPalette[0], size: PatternDimensions = dimensions): Pattern {
  const cells: PatternCell[] = [];

  for (let y = 1; y <= size.height; y += 1) {
    for (let x = 1; x <= size.width; x += 1) {
      cells.push({ x, y, color });
    }
  }

  return cellsToPattern(cells, size);
}

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "local-pattern-1",
    version: localPatternRecordVersion,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_100,
    title: "Draft 1",
    sourceFileName: "cat.png",
    width: dimensions.width,
    height: dimensions.height,
    paletteSlug: mard221Palette.slug,
    paletteVersion: mard221Palette.version,
    cellCodes: Array.from({ length: totalBeads }, () => mardPalette[0].code),
    usage: [{ code: mardPalette[0].code, count: totalBeads }],
    totalBeads,
    usedColorCount: 1,
    ownerScope: "anonymous-local",
    localRecordId: "local-pattern-1",
    remoteRecordId: null,
    syncStatus: "local-only",
    ...overrides,
  };
}

describe("local pattern persistence contract", () => {
  it("exports stable IndexedDB constants and bounded storage defaults", () => {
    expect(localPatternDbName).toBe("fundbeads-pattern-store");
    expect(localPatternDbVersion).toBe(1);
    expect(localPatternRecordVersion).toBe(1);
    expect(maxLocalPatternRecords).toBe(100);
  });

  it("normalizes a valid compact local pattern record", () => {
    const record = normalizeLocalPatternRecord(createRecord());

    expect(record).toMatchObject({
      id: "local-pattern-1",
      width: dimensions.width,
      height: dimensions.height,
      paletteSlug: "mard-221",
      paletteVersion: 1,
      totalBeads,
      usedColorCount: 1,
      ownerScope: "anonymous-local",
      remoteRecordId: null,
      syncStatus: "local-only",
    });
    expect(record?.cellCodes).toHaveLength(totalBeads);
  });

  it.each([
    ["unsupported version", { version: 999 }],
    ["zero width", { width: 0 }],
    ["oversized height", { height: 101 }],
    ["longest edge below minimum", { width: 39, height: 39, cellCodes: Array.from({ length: 39 * 39 }, () => mardPalette[0].code), usage: [{ code: mardPalette[0].code, count: 39 * 39 }], totalBeads: 39 * 39 }],
    ["wrong cell count", { cellCodes: [mardPalette[0].code] }],
    ["null cell code", { cellCodes: [null, ...Array.from({ length: totalBeads - 1 }, () => mardPalette[0].code)] }],
    ["undefined cell code", { cellCodes: [undefined, ...Array.from({ length: totalBeads - 1 }, () => mardPalette[0].code)] }],
    ["empty cell code", { cellCodes: ["", ...Array.from({ length: totalBeads - 1 }, () => mardPalette[0].code)] }],
    ["no-bead sentinel cell code", { cellCodes: ["NO_BEAD", ...Array.from({ length: totalBeads - 1 }, () => mardPalette[0].code)] }],
    ["unknown MARD code", { cellCodes: Array.from({ length: totalBeads }, () => "ZZ999"), usage: [{ code: "ZZ999", count: totalBeads }] }],
    ["duplicate usage rows", { usage: [{ code: mardPalette[0].code, count: totalBeads - 1 }, { code: mardPalette[0].code, count: 1 }], usedColorCount: 2 }],
    ["zero usage count", { usage: [{ code: mardPalette[0].code, count: 0 }] }],
    ["negative usage count", { usage: [{ code: mardPalette[0].code, count: -1 }] }],
    ["wrong usage total", { usage: [{ code: mardPalette[0].code, count: totalBeads - 1 }] }],
    ["usage that does not match cell code histogram", { usage: [{ code: mardPalette[1].code, count: totalBeads }] }],
    ["wrong used color count", { usedColorCount: 2 }],
    ["wrong total beads", { totalBeads: totalBeads - 1 }],
    ["wrong palette slug", { paletteSlug: "mard-mock" }],
    ["wrong palette version", { paletteVersion: mard221Palette.version + 1 }],
    ["remote sync status", { syncStatus: "synced" }],
    ["remote record id before sync exists", { remoteRecordId: "remote-1" }],
    ["object URL persistence", { previewObjectUrl: "blob:local-preview" }],
    ["source image saved flag", { sourceImageSaved: true }],
    ["source image reference", { sourceImageId: "source-1" }],
  ])("rejects %s", (_label, overrides) => {
    expect(normalizeLocalPatternRecord(createRecord(overrides))).toBeNull();
  });

  it("converts a Pattern into compact local record input without object URLs or RGB cell copies", () => {
    const pattern = createSolidPattern();
    const input = patternToLocalPatternRecordInput(pattern, {
      id: "pattern-input-1",
      createdAt: 1_700_000_000_000,
      sourceFileName: "sample.png",
      title: "Sample",
    });

    expect(input).toMatchObject({
      id: "pattern-input-1",
      width: dimensions.width,
      height: dimensions.height,
      paletteSlug: mard221Palette.slug,
      paletteVersion: mard221Palette.version,
      syncStatus: "local-only",
    });
    expect(input.cellCodes).toEqual(Array.from({ length: totalBeads }, () => mardPalette[0].code));
    expect(input.usage).toEqual([{ code: mardPalette[0].code, count: totalBeads }]);
    expect(JSON.stringify(input)).not.toContain("blob:");
    expect(JSON.stringify(input)).not.toContain('"r":');
    expect(input).not.toHaveProperty("sourceImageId");
    expect(input).not.toHaveProperty("sourceImageSaved");
  });

  it("persists paint-only and replace-only effective patterns when every cell remains coded", () => {
    const basePattern = createSolidPattern(mardPalette[0]);
    const paintState = paintPatternCell(createPatternEditState(basePattern, mardPalette), 0, mardPalette[1].code, mardPalette);
    const paintedPattern = getEffectivePattern(paintState, mardPalette);
    const replaceState = replacePatternColor(createPatternEditState(basePattern, mardPalette), mardPalette[0].code, mardPalette[1].code, mardPalette);
    const replacedPattern = getEffectivePattern(replaceState, mardPalette);

    expect(isCompleteCodedPattern(paintedPattern)).toBe(true);
    expect(isCompleteCodedPattern(replacedPattern)).toBe(true);
    expect(() => assertCompleteCodedPattern(paintedPattern)).not.toThrow();
    expect(patternToLocalPatternRecordInput(paintedPattern, { id: "painted-pattern", createdAt: 1_700_000_000_000 })).toMatchObject({
      id: "painted-pattern",
      totalBeads,
      usedColorCount: 2,
    });
    expect(patternToLocalPatternRecordInput(replacedPattern, { id: "replaced-pattern", createdAt: 1_700_000_000_000 })).toMatchObject({
      id: "replaced-pattern",
      totalBeads,
      usedColorCount: 1,
      usage: [{ code: mardPalette[1].code, count: totalBeads }],
    });
  });

  it("identifies complete coded patterns as the only compact local record input shape", () => {
    const pattern = createSolidPattern();

    expect(isCompleteCodedPattern(pattern)).toBe(true);
    expect(isCompleteCodedPattern(cellsToPattern(pattern.cells.map((cell, index) => (index === 0 ? { ...cell, color: null } : cell)), dimensions))).toBe(false);
    expect(isCompleteCodedPattern({ ...pattern, totalBeads: totalBeads - 1 })).toBe(false);
    expect(isCompleteCodedPattern(cellsToPattern([{ ...pattern.cells[0], x: 2 }, ...pattern.cells.slice(1)], dimensions))).toBe(false);
    expect(() => assertCompleteCodedPattern({ ...pattern, totalBeads: totalBeads - 1 })).toThrow("complete row-major coded pattern");
  });

  it("rejects no-bead cells until compact local records can represent empty cells", () => {
    const pattern = createSolidPattern();
    const noBeadPattern = cellsToPattern(
      pattern.cells.map((cell, index) => (index === 0 ? { ...cell, color: null } : cell)),
      dimensions,
    );

    expect(noBeadPattern.totalBeads).toBe(totalBeads - 1);
    expect(() =>
      patternToLocalPatternRecordInput(noBeadPattern, {
        id: "pattern-input-empty-cell",
        createdAt: 1_700_000_000_000,
      }),
    ).toThrow("complete row-major coded pattern");
  });

  it.each([
    { width: 64, height: 36 },
    { width: 36, height: 64 },
    { width: 100, height: 11 },
    { width: 11, height: 100 },
  ])("round-trips valid aspect-ratio pattern dimensions $width x $height", (size) => {
    const pattern = createSolidPattern(mardPalette[0], size);
    const input = patternToLocalPatternRecordInput(pattern, {
      id: `pattern-${size.width}x${size.height}`,
      createdAt: 1_700_000_000_000,
    });
    const record = normalizeLocalPatternRecord({ ...input, version: localPatternRecordVersion });

    expect(record).not.toBeNull();
    expect(record).toMatchObject({
      width: size.width,
      height: size.height,
      totalBeads: size.width * size.height,
      usedColorCount: 1,
    });

    const reconstructed = localPatternRecordToPattern(record!);
    expect(reconstructed).toMatchObject({
      width: size.width,
      height: size.height,
      totalBeads: size.width * size.height,
    });
    expect(reconstructed.cells[0]).toEqual({ x: 1, y: 1, color: mardPalette[0] });
    expect(reconstructed.cells[size.width - 1]).toEqual({ x: size.width, y: 1, color: mardPalette[0] });
    expect(reconstructed.cells[size.width]).toEqual({ x: 1, y: 2, color: mardPalette[0] });
    expect(reconstructed.cells.at(-1)).toEqual({ x: size.width, y: size.height, color: mardPalette[0] });
  });

  it("reconstructs a Pattern from a valid local record using the active palette", () => {
    const record = normalizeLocalPatternRecord(createRecord());

    expect(record).not.toBeNull();
    const pattern = localPatternRecordToPattern(record!);

    expect(pattern.width).toBe(dimensions.width);
    expect(pattern.height).toBe(dimensions.height);
    expect(pattern.totalBeads).toBe(totalBeads);
    expect(pattern.cells[0]).toEqual({ x: 1, y: 1, color: mardPalette[0] });
    expect(pattern.cells[dimensions.width]).toEqual({ x: 1, y: 2, color: mardPalette[0] });
    expect(pattern.usage).toEqual([{ color: mardPalette[0], count: totalBeads }]);
  });

  it("estimates record storage cost without requiring source image blobs", () => {
    const record = normalizeLocalPatternRecord(createRecord());

    expect(record).not.toBeNull();
    expect(estimateLocalPatternRecordBytes(record!)).toBeGreaterThan(totalBeads);
    expect(record).not.toHaveProperty("sourceImageId");
    expect(record).not.toHaveProperty("sourceImageSaved");
  });
});

describe("local pattern IndexedDB operations", () => {
  beforeEach(async () => {
    await deleteLocalPatternDatabaseForTests();
  });

  it("reports unavailable storage when IndexedDB globals are missing", () => {
    const indexedDb = globalThis.indexedDB;
    const idbKeyRange = globalThis.IDBKeyRange;

    vi.stubGlobal("indexedDB", undefined);
    vi.stubGlobal("IDBKeyRange", undefined);

    try {
      expect(canUseLocalPatternDb()).toBe(false);
    } finally {
      vi.stubGlobal("indexedDB", indexedDb);
      vi.stubGlobal("IDBKeyRange", idbKeyRange);
    }
  });

  it("returns a typed save failure when IndexedDB is unavailable", async () => {
    const indexedDb = globalThis.indexedDB;
    const idbKeyRange = globalThis.IDBKeyRange;

    vi.stubGlobal("indexedDB", undefined);
    vi.stubGlobal("IDBKeyRange", undefined);

    try {
      await expect(
        saveLocalPatternRecord(
          patternToLocalPatternRecordInput(createSolidPattern(), {
            id: "unavailable-pattern",
            createdAt: 1_700_000_000_000,
          }),
        ),
      ).resolves.toEqual({ ok: false, reason: "unavailable" });
    } finally {
      vi.stubGlobal("indexedDB", indexedDb);
      vi.stubGlobal("IDBKeyRange", idbKeyRange);
    }
  });

  it("saves, reads, lists, deletes, and clears local pattern records", async () => {
    const first = patternToLocalPatternRecordInput(createSolidPattern(mardPalette[0]), {
      id: "pattern-1",
      createdAt: 1_700_000_000_000,
      title: "First",
    });
    const second = patternToLocalPatternRecordInput(createSolidPattern(mardPalette[1]), {
      id: "pattern-2",
      createdAt: 1_700_000_010_000,
      title: "Second",
    });

    await expect(saveLocalPatternRecord(first)).resolves.toMatchObject({ ok: true });
    await expect(saveLocalPatternRecord(second)).resolves.toMatchObject({ ok: true });

    expect(await readLocalPatternRecord("pattern-1")).toMatchObject({ id: "pattern-1", title: "First" });
    await expect(listLocalPatternRecords({ offset: 0, limit: 1 })).resolves.toMatchObject({
      records: [{ id: "pattern-2" }],
      hasNext: true,
    });

    await deleteLocalPatternRecord("pattern-2");
    await expect(readLocalPatternRecord("pattern-2")).resolves.toBeNull();

    await clearLocalPatternRecords();
    await expect(listLocalPatternRecords({ offset: 0, limit: 10 })).resolves.toEqual({ records: [], hasNext: false });
  });

  it("overwrites duplicate local pattern ids with the latest valid record", async () => {
    const first = patternToLocalPatternRecordInput(createSolidPattern(mardPalette[0]), {
      id: "pattern-duplicate",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      title: "Original",
    });
    const second = patternToLocalPatternRecordInput(createSolidPattern(mardPalette[1]), {
      id: "pattern-duplicate",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_010_000,
      title: "Updated",
    });

    await expect(saveLocalPatternRecord(first)).resolves.toMatchObject({ ok: true });
    await expect(saveLocalPatternRecord(second)).resolves.toMatchObject({ ok: true });

    await expect(readLocalPatternRecord("pattern-duplicate")).resolves.toMatchObject({
      id: "pattern-duplicate",
      title: "Updated",
      usage: [{ code: mardPalette[1].code, count: totalBeads }],
    });
    await expect(listLocalPatternRecords({ offset: 0, limit: 10 })).resolves.toMatchObject({
      records: [{ id: "pattern-duplicate", title: "Updated" }],
      hasNext: false,
    });
  });

  it("normalizes invalid list pagination inputs before querying IndexedDB", async () => {
    await saveLocalPatternRecord(
      patternToLocalPatternRecordInput(createSolidPattern(mardPalette[0]), {
        id: "pattern-invalid-pagination",
        createdAt: 1_700_000_000_000,
      }),
    );

    await expect(listLocalPatternRecords({ offset: Number.NaN, limit: Number.NaN })).resolves.toMatchObject({
      records: [{ id: "pattern-invalid-pagination" }],
      hasNext: false,
    });
  });

  it("prunes oldest records beyond the local pattern record limit", async () => {
    for (let index = 0; index < maxLocalPatternRecords + 2; index += 1) {
      const createdAt = 1_700_000_000_000 + index;

      await saveLocalPatternRecord(
        patternToLocalPatternRecordInput(createSolidPattern(mardPalette[index % 2]), {
          id: `pattern-${index}`,
          createdAt,
        }),
      );
    }

    const page = await listLocalPatternRecords({ offset: 0, limit: maxLocalPatternRecords });

    expect(page.records).toHaveLength(maxLocalPatternRecords);
    expect(page.records[0].id).toBe(`pattern-${maxLocalPatternRecords + 1}`);
    expect(page.records.at(-1)?.id).toBe("pattern-2");
    await expect(readLocalPatternRecord("pattern-0")).resolves.toBeNull();
    await expect(readLocalPatternRecord("pattern-1")).resolves.toBeNull();
  });
});
