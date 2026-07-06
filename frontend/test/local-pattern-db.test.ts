import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mard221Palette, mardPalette, type BeadColor } from "../src/palette";
import { cellsToPattern, type Pattern, type PatternDimensions, type PatternCell } from "../src/pattern";
import {
  canUseLocalPatternDb,
  clearLocalPatternRecords,
  deleteLocalPatternDatabaseForTests,
  deleteLocalPatternRecord,
  estimateLocalPatternRecordBytes,
  listLocalPatternRecords,
  localPatternDbName,
  localPatternDbVersion,
  localPatternRecordVersion,
  localPatternRecordToPattern,
  maxLocalPatternRecords,
  maxLocalSourceImageBytes,
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
    sourceImageSaved: false,
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
    expect(maxLocalSourceImageBytes).toBe(100 * 1024 * 1024);
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
      sourceImageSaved: false,
      ownerScope: "anonymous-local",
      remoteRecordId: null,
      syncStatus: "local-only",
    });
    expect(record?.cellCodes).toHaveLength(totalBeads);
  });

  it.each([
    ["unsupported version", { version: 999 }],
    ["unsupported width", { width: 39 }],
    ["unsupported height", { height: 101 }],
    ["wrong cell count", { cellCodes: [mardPalette[0].code] }],
    ["unknown MARD code", { cellCodes: Array.from({ length: totalBeads }, () => "ZZ999"), usage: [{ code: "ZZ999", count: totalBeads }] }],
    ["wrong usage total", { usage: [{ code: mardPalette[0].code, count: totalBeads - 1 }] }],
    ["usage that does not match cell code histogram", { usage: [{ code: mardPalette[1].code, count: totalBeads }] }],
    ["wrong used color count", { usedColorCount: 2 }],
    ["wrong total beads", { totalBeads: totalBeads - 1 }],
    ["wrong palette slug", { paletteSlug: "mard-mock" }],
    ["wrong palette version", { paletteVersion: mard221Palette.version + 1 }],
    ["remote sync status", { syncStatus: "synced" }],
    ["remote record id before sync exists", { remoteRecordId: "remote-1" }],
    ["object URL persistence", { previewObjectUrl: "blob:local-preview" }],
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
      sourceImageSaved: false,
      syncStatus: "local-only",
    });
    expect(input.cellCodes).toEqual(Array.from({ length: totalBeads }, () => mardPalette[0].code));
    expect(input.usage).toEqual([{ code: mardPalette[0].code, count: totalBeads }]);
    expect(JSON.stringify(input)).not.toContain("blob:");
    expect(JSON.stringify(input)).not.toContain('"r":');
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
    expect(record?.sourceImageId).toBeUndefined();
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
