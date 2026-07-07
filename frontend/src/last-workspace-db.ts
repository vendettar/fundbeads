import Dexie, { type Table } from "dexie";

import { localPatternRecordToPattern, normalizeLocalPatternRecord, patternToLocalPatternRecordInput } from "./local-pattern-codec";
import type { LocalPatternRecord } from "./local-pattern-record";
import { mardPalette } from "./palette";
import type { PatternEditOverrideMap } from "./pattern-edit";
import { defaultPatternPreferences, normalizePatternPreferences, type PatternPreferences } from "./pattern-preferences";
import type { Pattern, SourceImageSize } from "./pattern";
import { isAcceptedImageFile, isWithinUploadFileSizeLimit } from "./use-pattern-processing";

export const lastWorkspaceDbName = "fundbeads-last-workspace";
export const lastWorkspaceRecordId = "last-workspace";
export const lastWorkspacePatternRecordId = "last-workspace-pattern";
export const lastWorkspaceRecordVersion = 1;

type LastWorkspaceStorageRecord = {
  id: typeof lastWorkspaceRecordId;
  version: typeof lastWorkspaceRecordVersion;
  updatedAt: number;
  sourceFileName: string;
  sourceMimeType: string;
  sourceImage: Blob;
  sourceImageSize: SourceImageSize | null;
  basePatternRecord: LocalPatternRecord;
  overrides: PatternEditOverrideMap;
  preferences: PatternPreferences;
};

export type LastWorkspaceRecord = Omit<LastWorkspaceStorageRecord, "basePatternRecord"> & {
  basePattern: Pattern;
};

export type LastWorkspaceRecordInput = {
  sourceImage: Blob;
  sourceFileName: string;
  sourceMimeType?: string;
  sourceImageSize: SourceImageSize | null;
  basePattern: Pattern;
  overrides: PatternEditOverrideMap;
  preferences: PatternPreferences;
  updatedAt?: number;
};

export type LastWorkspaceSaveResult =
  | { ok: true; record: LastWorkspaceRecord }
  | { ok: false; reason: "unavailable" | "invalid" | "quota" | "failed"; error?: unknown };

class LastWorkspaceDb extends Dexie {
  workspaces!: Table<LastWorkspaceStorageRecord, string>;

  constructor() {
    super(lastWorkspaceDbName);

    this.version(lastWorkspaceRecordVersion).stores({
      workspaces: "id, updatedAt",
    });
  }
}

type LastWorkspaceDbHandle = {
  close: () => void;
  workspaces: Pick<Table<LastWorkspaceStorageRecord, string>, "delete" | "get" | "put">;
};

let lastWorkspaceDb: LastWorkspaceDbHandle = new LastWorkspaceDb();

export function canUseLastWorkspaceDb(): boolean {
  return typeof indexedDB !== "undefined" && typeof IDBKeyRange !== "undefined";
}

export async function saveLastWorkspaceRecord(input: LastWorkspaceRecordInput): Promise<LastWorkspaceSaveResult> {
  if (!canUseLastWorkspaceDb()) {
    return { ok: false, reason: "unavailable" };
  }

  const updatedAt = normalizeTimestamp(input.updatedAt);
  let storageRecord: { storageRecord: LastWorkspaceStorageRecord; record: LastWorkspaceRecord } | null = null;
  try {
    const basePatternRecord = normalizeLocalPatternRecord({
      ...patternToLocalPatternRecordInput(input.basePattern, {
        id: lastWorkspacePatternRecordId,
        createdAt: updatedAt,
        updatedAt,
        sourceFileName: input.sourceFileName,
      }),
      version: 1,
    });
    const preferences = normalizePatternPreferences(input.preferences) ?? defaultPatternPreferences;
    storageRecord = normalizeLastWorkspaceStorageRecord({
      id: lastWorkspaceRecordId,
      version: lastWorkspaceRecordVersion,
      updatedAt,
      sourceFileName: input.sourceFileName,
      sourceMimeType: input.sourceMimeType ?? input.sourceImage.type,
      sourceImage: input.sourceImage,
      sourceImageSize: input.sourceImageSize,
      basePatternRecord,
      overrides: input.overrides,
      preferences,
    });
  } catch (error) {
    return { ok: false, reason: "invalid", error };
  }

  if (!storageRecord) {
    return { ok: false, reason: "invalid" };
  }

  try {
    await lastWorkspaceDb.workspaces.put(storageRecord.storageRecord);
    return { ok: true, record: storageRecord.record };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "failed", error };
  }
}

export async function readLastWorkspaceRecord(): Promise<LastWorkspaceRecord | null> {
  if (!canUseLastWorkspaceDb()) {
    return null;
  }

  try {
    const storageRecord = await lastWorkspaceDb.workspaces.get(lastWorkspaceRecordId);
    return normalizeLastWorkspaceStorageRecord(storageRecord)?.record ?? null;
  } catch {
    return null;
  }
}

export async function clearLastWorkspaceRecord(): Promise<void> {
  if (!canUseLastWorkspaceDb()) {
    return;
  }

  try {
    await lastWorkspaceDb.workspaces.delete(lastWorkspaceRecordId);
  } catch {
    // Latest-workspace persistence is optional browser-local recovery state.
  }
}

export async function deleteLastWorkspaceDatabaseForTests(): Promise<void> {
  lastWorkspaceDb.close();
  await Dexie.delete(lastWorkspaceDbName);
  lastWorkspaceDb = new LastWorkspaceDb();
}

export function replaceLastWorkspaceDbForTests(nextDb: LastWorkspaceDbHandle): () => void {
  const previousDb = lastWorkspaceDb;
  lastWorkspaceDb = nextDb;
  return () => {
    lastWorkspaceDb = previousDb;
  };
}

function normalizeLastWorkspaceStorageRecord(value: unknown): { storageRecord: LastWorkspaceStorageRecord; record: LastWorkspaceRecord } | null {
  if (!isRecord(value)) {
    return null;
  }

  const basePatternRecord = normalizeLocalPatternRecord(value.basePatternRecord);
  const preferences = normalizePatternPreferences(value.preferences);
  const sourceImageSize = normalizeSourceImageSize(value.sourceImageSize);

  if (
    value.id !== lastWorkspaceRecordId ||
    value.version !== lastWorkspaceRecordVersion ||
    !isSafeNonNegativeInteger(value.updatedAt) ||
    typeof value.sourceFileName !== "string" ||
    value.sourceFileName.trim() === "" ||
    typeof value.sourceMimeType !== "string" ||
    !isBlob(value.sourceImage) ||
    !basePatternRecord ||
    !preferences ||
    sourceImageSize === undefined
  ) {
    return null;
  }

  const sourceMimeType = value.sourceMimeType || value.sourceImage.type;
  const sourceFile = { name: value.sourceFileName, type: sourceMimeType, size: value.sourceImage.size };
  const basePattern = localPatternRecordToPattern(basePatternRecord);
  const overrides = normalizeLastWorkspaceOverrides(basePattern, value.overrides);
  if (!isAcceptedImageFile(sourceFile) || !isWithinUploadFileSizeLimit(sourceFile) || !isCompleteBasePattern(basePattern) || overrides === null) {
    return null;
  }

  const storageRecord: LastWorkspaceStorageRecord = {
    id: lastWorkspaceRecordId,
    version: lastWorkspaceRecordVersion,
    updatedAt: value.updatedAt,
    sourceFileName: value.sourceFileName,
    sourceMimeType,
    sourceImage: value.sourceImage,
    sourceImageSize,
    basePatternRecord,
    overrides,
    preferences,
  };

  return {
    storageRecord,
    record: {
      id: storageRecord.id,
      version: storageRecord.version,
      updatedAt: storageRecord.updatedAt,
      sourceFileName: storageRecord.sourceFileName,
      sourceMimeType: storageRecord.sourceMimeType,
      sourceImage: storageRecord.sourceImage,
      sourceImageSize: storageRecord.sourceImageSize,
      preferences: storageRecord.preferences,
      overrides: storageRecord.overrides,
      basePattern,
    },
  };
}

function normalizeLastWorkspaceOverrides(basePattern: Pattern, value: unknown): PatternEditOverrideMap | null {
  if (!isRecord(value) || Array.isArray(value)) {
    return null;
  }

  const paletteByCode = new Map(mardPalette.map((color) => [color.code, color]));
  const normalized: PatternEditOverrideMap = {};

  for (const [indexKey, colorCode] of Object.entries(value)) {
    const index = Number(indexKey);
    if (!Number.isInteger(index) || index < 0 || index >= basePattern.cells.length) {
      return null;
    }

    if (colorCode === null) {
      normalized[index] = null;
      continue;
    }

    if (typeof colorCode !== "string" || !paletteByCode.has(colorCode)) {
      return null;
    }

    if (basePattern.cells[index].color?.code !== colorCode) {
      normalized[index] = colorCode;
    }
  }

  return normalized;
}

function isCompleteBasePattern(pattern: Pattern): boolean {
  return pattern.totalBeads === pattern.cells.length && pattern.cells.every((cell) => Boolean(cell.color?.code));
}

function normalizeSourceImageSize(value: unknown): SourceImageSize | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value) || !isPositiveFiniteNumber(value.width) || !isPositiveFiniteNumber(value.height)) {
    return undefined;
  }
  return { width: value.width, height: value.height };
}

function normalizeTimestamp(value: number | undefined): number {
  return isSafeNonNegativeInteger(value) ? value : Date.now();
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}
