import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  defaultPatternPreferences,
  patternPreferencesStorageKey,
  readStoredPatternPreferences,
  writeStoredPatternPreferences,
  type PatternPreferences,
} from "../src/pattern-preferences";
import { mardPalette, type BeadColor } from "../src/palette";
import {
  cellsToPattern,
  defaultColorDistanceMode,
  defaultDitherMode,
  defaultMaxColorCount,
  defaultSmoothingLevel,
  maxColorCountMax,
  patternLongestEdgePresets,
  type Pattern,
  type PatternCell,
  type PatternDimensions,
} from "../src/pattern";
import { createPatternEditState, erasePatternCell, getEffectivePattern } from "../src/pattern-edit";
import {
  canUseLastWorkspaceDb,
  clearLastWorkspaceRecord,
  deleteLastWorkspaceDatabaseForTests,
  lastWorkspaceDbName,
  lastWorkspaceRecordId,
  lastWorkspaceRecordVersion,
  readLastWorkspaceRecord,
  replaceLastWorkspaceDbForTests,
  saveLastWorkspaceRecord,
} from "../src/last-workspace-db";

const dimensions: PatternDimensions = { width: 40, height: 40 };

function createSolidPattern(color: BeadColor = mardPalette[0], size: PatternDimensions = dimensions): Pattern {
  const cells: PatternCell[] = [];

  for (let y = 1; y <= size.height; y += 1) {
    for (let x = 1; x <= size.width; x += 1) {
      cells.push({ x, y, color });
    }
  }

  return cellsToPattern(cells, size);
}

async function blobText(blob: Blob) {
  return await blob.text();
}

function memoryStorage(initialValue?: string): Storage {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(patternPreferencesStorageKey, initialValue);
  }

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function throwingStorage(): Storage {
  return {
    length: 0,
    clear() {
      throw new Error("blocked");
    },
    getItem() {
      throw new Error("blocked");
    },
    key() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
}

describe("pattern preference persistence", () => {
  it("defines stable defaults for local pattern generation controls", () => {
    expect(patternPreferencesStorageKey).toBe("fundbeads.patternPreferences");
    expect(defaultPatternPreferences).toEqual({
      longestEdge: patternLongestEdgePresets[0],
      colorDistanceMode: defaultColorDistanceMode,
      ditherMode: defaultDitherMode,
      smoothingLevel: defaultSmoothingLevel,
      maxColorCount: defaultMaxColorCount,
    });
  });

  it("round-trips normalized pattern preferences through localStorage", () => {
    const storage = memoryStorage();

    writeStoredPatternPreferences(storage, {
      longestEdge: 78,
      colorDistanceMode: "weighted-rgb",
      ditherMode: "ordered",
      smoothingLevel: 2,
      maxColorCount: 18,
    });

    expect(storage.getItem(patternPreferencesStorageKey)).toBe(JSON.stringify({
      version: 1,
      longestEdge: 78,
      colorDistanceMode: "weighted-rgb",
      ditherMode: "ordered",
      smoothingLevel: 2,
      maxColorCount: 18,
    }));
    expect(readStoredPatternPreferences(storage)).toEqual({
      longestEdge: 78,
      colorDistanceMode: "weighted-rgb",
      ditherMode: "ordered",
      smoothingLevel: 2,
      maxColorCount: 18,
    });
  });

  it("normalizes partial and invalid stored values without throwing", () => {
    const storage = memoryStorage(
      JSON.stringify({
        version: 1,
        longestEdge: 999,
        colorDistanceMode: "bad-mode",
        ditherMode: "floyd-steinberg",
        smoothingLevel: -1,
        maxColorCount: 999,
      }),
    );

    expect(readStoredPatternPreferences(storage)).toEqual({
      ...defaultPatternPreferences,
      longestEdge: 100,
      ditherMode: "floyd-steinberg",
      smoothingLevel: 0,
      maxColorCount: maxColorCountMax,
    });
    expect(readStoredPatternPreferences(memoryStorage("not-json"))).toBeNull();
    expect(readStoredPatternPreferences(throwingStorage())).toBeNull();
    expect(() => writeStoredPatternPreferences(throwingStorage(), defaultPatternPreferences)).not.toThrow();
  });
});

describe("last workspace IndexedDB persistence", () => {
  beforeEach(async () => {
    await deleteLastWorkspaceDatabaseForTests();
  });

  it("exports a stable single-record workspace contract", () => {
    expect(lastWorkspaceDbName).toBe("fundbeads-last-workspace");
    expect(lastWorkspaceRecordId).toBe("last-workspace");
    expect(lastWorkspaceRecordVersion).toBe(1);
    expect(canUseLastWorkspaceDb()).toBe(true);
  });

  it("saves and restores the latest source image, base pattern, edit overrides, source size, and preferences", async () => {
    const sourceImage = new Blob(["first-image"], { type: "image/png" });
    const preferences: PatternPreferences = {
      longestEdge: 78,
      colorDistanceMode: "weighted-rgb",
      ditherMode: "ordered",
      smoothingLevel: 2,
      maxColorCount: 18,
    };
    const basePattern = createSolidPattern(mardPalette[1], { width: 64, height: 40 });
    const editedState = erasePatternCell(createPatternEditState(basePattern, mardPalette), 0, mardPalette);
    const effectivePattern = getEffectivePattern(editedState, mardPalette);

    const saveResult = await saveLastWorkspaceRecord({
      sourceImage,
      sourceFileName: "first.png",
      sourceMimeType: "image/png",
      sourceImageSize: { width: 640, height: 400 },
      basePattern,
      overrides: editedState.overrides,
      preferences,
      updatedAt: 1_700_000_000_000,
    });

    expect(saveResult.ok).toBe(true);
    const record = await readLastWorkspaceRecord();

    expect(record).toMatchObject({
      id: "last-workspace",
      version: 1,
      updatedAt: 1_700_000_000_000,
      sourceFileName: "first.png",
      sourceMimeType: "image/png",
      sourceImageSize: { width: 640, height: 400 },
      preferences,
    });
    expect(record?.basePattern).toMatchObject({ width: 64, height: 40, totalBeads: 64 * 40 });
    expect(record?.basePattern.cells[0].color?.code).toBe(mardPalette[1].code);
    expect(record?.overrides).toEqual({ 0: null });
    expect(effectivePattern.cells[0].color).toBeNull();
    expect(getEffectivePattern(createPatternEditState(record!.basePattern, mardPalette, { overrides: record!.overrides }), mardPalette).cells[0].color).toBeNull();
    expect(await blobText(record!.sourceImage)).toBe("first-image");
    expect(JSON.stringify(record)).not.toContain("blob:");
  });

  it("overwrites the single last workspace record on a new upload", async () => {
    await saveLastWorkspaceRecord({
      sourceImage: new Blob(["first-image"], { type: "image/png" }),
      sourceFileName: "first.png",
      sourceMimeType: "image/png",
      sourceImageSize: { width: 640, height: 400 },
      basePattern: createSolidPattern(mardPalette[0]),
      overrides: {},
      preferences: defaultPatternPreferences,
      updatedAt: 1_700_000_000_000,
    });

    const replacementPreferences: PatternPreferences = {
      ...defaultPatternPreferences,
      longestEdge: 52,
      colorDistanceMode: "lab-delta-e",
      ditherMode: "floyd-steinberg",
    };
    await saveLastWorkspaceRecord({
      sourceImage: new Blob(["second-image"], { type: "image/webp" }),
      sourceFileName: "second.webp",
      sourceMimeType: "image/webp",
      sourceImageSize: { width: 512, height: 512 },
      basePattern: createSolidPattern(mardPalette[2], { width: 52, height: 52 }),
      overrides: {},
      preferences: replacementPreferences,
      updatedAt: 1_700_000_000_500,
    });

    const record = await readLastWorkspaceRecord();

    expect(record).toMatchObject({
      sourceFileName: "second.webp",
      sourceMimeType: "image/webp",
      updatedAt: 1_700_000_000_500,
      preferences: replacementPreferences,
    });
    expect(record?.basePattern).toMatchObject({ width: 52, height: 52 });
    expect(record?.basePattern.cells[0].color?.code).toBe(mardPalette[2].code);
    expect(record?.overrides).toEqual({});
    expect(await blobText(record!.sourceImage)).toBe("second-image");
  });

  it.each([
    ["unsupported source MIME", new Blob(["svg"], { type: "image/svg+xml" }), "vector.svg", "image/svg+xml"],
    ["source image over 10MB", new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" }), "huge.png", "image/png"],
  ])("rejects latest workspace records with %s", async (_label, sourceImage, sourceFileName, sourceMimeType) => {
    await expect(
      saveLastWorkspaceRecord({
        sourceImage,
        sourceFileName,
        sourceMimeType,
        sourceImageSize: null,
        basePattern: createSolidPattern(),
        overrides: {},
        preferences: defaultPatternPreferences,
        updatedAt: 1_700_000_000_000,
      }),
    ).resolves.toMatchObject({ ok: false, reason: "invalid" });
    await expect(readLastWorkspaceRecord()).resolves.toBeNull();
  });

  it("clears the last workspace record", async () => {
    await saveLastWorkspaceRecord({
      sourceImage: new Blob(["first-image"], { type: "image/png" }),
      sourceFileName: "first.png",
      sourceMimeType: "image/png",
      sourceImageSize: null,
      basePattern: createSolidPattern(),
      overrides: {},
      preferences: defaultPatternPreferences,
      updatedAt: 1_700_000_000_000,
    });

    await clearLastWorkspaceRecord();

    expect(await readLastWorkspaceRecord()).toBeNull();
  });

  it("returns null instead of throwing when latest workspace read fails", async () => {
    const restoreDb = replaceLastWorkspaceDbForTests({
      close: vi.fn(),
      workspaces: {
        get: vi.fn().mockRejectedValue(new Error("blocked read")),
        put: vi.fn(),
        delete: vi.fn(),
      },
    });

    try {
      await expect(readLastWorkspaceRecord()).resolves.toBeNull();
    } finally {
      restoreDb();
    }
  });

  it("ignores latest workspace clear failures", async () => {
    const restoreDb = replaceLastWorkspaceDbForTests({
      close: vi.fn(),
      workspaces: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn().mockRejectedValue(new Error("blocked delete")),
      },
    });

    try {
      await expect(clearLastWorkspaceRecord()).resolves.toBeUndefined();
    } finally {
      restoreDb();
    }
  });
});
