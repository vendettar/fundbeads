import Dexie, { type Table } from "dexie";

import { mard221Palette, mardPalette, type BeadColor } from "./palette";
import { cellsToPattern, patternDimensionMax, patternDimensionMin, type Pattern, type PatternCell } from "./pattern";

export const localPatternDbName = "fundbeads-pattern-store";
export const localPatternDbVersion = 1;
export const localPatternRecordVersion = 1;
export const maxLocalPatternRecords = 100;
export const maxLocalSourceImageBytes = 100 * 1024 * 1024;
export const maxLocalPatternListPageSize = 100;

export type LocalPatternUsage = {
  code: string;
  count: number;
};

export type LocalPatternOwnerScope = "anonymous-local";
export type LocalPatternSyncStatus = "local-only";

export type LocalPatternRecord = {
  id: string;
  version: typeof localPatternRecordVersion;
  createdAt: number;
  updatedAt: number;
  title?: string;
  sourceFileName?: string;
  width: number;
  height: number;
  paletteSlug: typeof mard221Palette.slug;
  paletteVersion: typeof mard221Palette.version;
  cellCodes: string[];
  usage: LocalPatternUsage[];
  totalBeads: number;
  usedColorCount: number;
  sourceImageId?: string;
  sourceImageSaved: boolean;
  ownerScope: LocalPatternOwnerScope;
  localRecordId: string;
  remoteRecordId: null;
  syncStatus: LocalPatternSyncStatus;
};

export type LocalPatternRecordInput = Omit<LocalPatternRecord, "version"> & {
  version?: number;
};

export type LocalPatternRecordMetadata = {
  id: string;
  createdAt?: number;
  updatedAt?: number;
  title?: string;
  sourceFileName?: string;
  sourceImageId?: string;
  sourceImageSaved?: boolean;
};

export type LocalPatternSaveResult =
  | { ok: true; record: LocalPatternRecord }
  | { ok: false; reason: "unavailable" | "invalid" | "quota" | "failed"; error?: unknown };

export type LocalPatternListOptions = {
  offset: number;
  limit: number;
};

export type LocalPatternRecordPage = {
  records: LocalPatternRecord[];
  hasNext: boolean;
};

type LocalPatternSourceImage = {
  id: string;
  patternId: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png";
  sizeBytes: number;
  createdAt: number;
  blob: Blob;
};

class LocalPatternDb extends Dexie {
  records!: Table<LocalPatternRecord, string>;
  sourceImages!: Table<LocalPatternSourceImage, string>;

  constructor() {
    super(localPatternDbName);

    this.version(localPatternDbVersion).stores({
      records: "id, updatedAt, createdAt, paletteSlug, ownerScope, syncStatus",
      sourceImages: "id, patternId, createdAt, sizeBytes",
    });
  }
}

let localPatternDb = new LocalPatternDb();
const paletteByCode = new Map<string, BeadColor>(mardPalette.map((color) => [color.code, color]));

export function canUseLocalPatternDb(): boolean {
  return typeof indexedDB !== "undefined" && typeof IDBKeyRange !== "undefined";
}

export function patternToLocalPatternRecordInput(pattern: Pattern, metadata: LocalPatternRecordMetadata): LocalPatternRecordInput {
  const createdAt = metadata.createdAt ?? Date.now();
  const sourceImageSaved = metadata.sourceImageSaved === true;

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
    cellCodes: pattern.cells.map((cell) => cell.color.code),
    usage: pattern.usage.map(({ color, count }) => ({ code: color.code, count })),
    totalBeads: pattern.totalBeads,
    usedColorCount: pattern.usage.length,
    sourceImageId: sourceImageSaved ? metadata.sourceImageId : undefined,
    sourceImageSaved,
    ownerScope: "anonymous-local",
    localRecordId: metadata.id,
    remoteRecordId: null,
    syncStatus: "local-only",
  };
}

export function normalizeLocalPatternRecord(value: unknown): LocalPatternRecord | null {
  if (!isRecord(value) || "previewObjectUrl" in value) {
    return null;
  }

  const width = value.width;
  const height = value.height;
  if (!isSupportedDimension(width) || !isSupportedDimension(height)) {
    return null;
  }

  const expectedTotal = width * height;
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
    value.cellCodes.length !== expectedTotal ||
    !Array.isArray(value.usage) ||
    value.totalBeads !== expectedTotal ||
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

  const sourceImageSaved = value.sourceImageSaved === true;
  if (value.sourceImageSaved !== true && value.sourceImageSaved !== false) {
    return null;
  }
  if (value.sourceImageId !== undefined && typeof value.sourceImageId !== "string") {
    return null;
  }
  if (sourceImageSaved !== (typeof value.sourceImageId === "string" && value.sourceImageId.length > 0)) {
    return null;
  }

  const histogram = new Map<string, number>();
  for (const code of value.cellCodes) {
    if (typeof code !== "string" || !paletteByCode.has(code)) {
      return null;
    }
    histogram.set(code, (histogram.get(code) ?? 0) + 1);
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
    cellCodes: [...value.cellCodes],
    usage: normalizedUsage,
    totalBeads: expectedTotal,
    usedColorCount: normalizedUsage.length,
    sourceImageId: sourceImageSaved ? value.sourceImageId : undefined,
    sourceImageSaved,
    ownerScope: "anonymous-local",
    localRecordId: value.localRecordId,
    remoteRecordId: null,
    syncStatus: "local-only",
  };
}

export function localPatternRecordToPattern(record: LocalPatternRecord): Pattern {
  const cells: PatternCell[] = record.cellCodes.map((code, index) => {
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

export async function saveLocalPatternRecord(input: LocalPatternRecordInput): Promise<LocalPatternSaveResult> {
  if (!canUseLocalPatternDb()) {
    return { ok: false, reason: "unavailable" };
  }

  const record = normalizeLocalPatternRecord({
    ...input,
    version: localPatternRecordVersion,
    localRecordId: input.localRecordId || input.id,
    remoteRecordId: null,
    ownerScope: "anonymous-local",
    syncStatus: "local-only",
  });
  if (!record) {
    return { ok: false, reason: "invalid" };
  }

  try {
    await localPatternDb.records.put(record);
    await pruneLocalPatternRecords();
    return { ok: true, record };
  } catch (error) {
    if (isQuotaError(error)) {
      try {
        await pruneLocalPatternRecords(1);
        await localPatternDb.records.put(record);
        return { ok: true, record };
      } catch (retryError) {
        return { ok: false, reason: "quota", error: retryError };
      }
    }

    return { ok: false, reason: "failed", error };
  }
}

export async function readLocalPatternRecord(id: string): Promise<LocalPatternRecord | null> {
  if (!canUseLocalPatternDb()) {
    return null;
  }

  const record = await localPatternDb.records.get(id);
  return normalizeLocalPatternRecord(record);
}

export async function listLocalPatternRecords({ offset, limit }: LocalPatternListOptions): Promise<LocalPatternRecordPage> {
  if (!canUseLocalPatternDb()) {
    return { records: [], hasNext: false };
  }

  const safeOffset = Math.max(0, Math.trunc(offset));
  const safeLimit = Math.min(maxLocalPatternListPageSize, Math.max(1, Math.trunc(limit)));
  const records = await localPatternDb.records.orderBy("updatedAt").reverse().offset(safeOffset).limit(safeLimit + 1).toArray();
  const normalized = records.map(normalizeLocalPatternRecord).filter(isLocalPatternRecord);

  return {
    records: normalized.slice(0, safeLimit),
    hasNext: normalized.length > safeLimit,
  };
}

export async function deleteLocalPatternRecord(id: string): Promise<void> {
  if (!canUseLocalPatternDb()) {
    return;
  }

  await localPatternDb.transaction("rw", localPatternDb.records, localPatternDb.sourceImages, async () => {
    await localPatternDb.sourceImages.where("patternId").equals(id).delete();
    await localPatternDb.records.delete(id);
  });
}

export async function clearLocalPatternRecords(): Promise<void> {
  if (!canUseLocalPatternDb()) {
    return;
  }

  await localPatternDb.transaction("rw", localPatternDb.records, localPatternDb.sourceImages, async () => {
    await localPatternDb.sourceImages.clear();
    await localPatternDb.records.clear();
  });
}

export async function pruneLocalPatternRecords(forceDeleteCount = 0): Promise<void> {
  if (!canUseLocalPatternDb()) {
    return;
  }

  const records = await localPatternDb.records.orderBy("updatedAt").reverse().toArray();
  const deleteCount = Math.max(forceDeleteCount, records.length - maxLocalPatternRecords);
  if (deleteCount <= 0) {
    return;
  }

  const idsToDelete = records.slice(-deleteCount).map((record) => record.id);
  await localPatternDb.transaction("rw", localPatternDb.records, localPatternDb.sourceImages, async () => {
    await localPatternDb.sourceImages.where("patternId").anyOf(idsToDelete).delete();
    await localPatternDb.records.bulkDelete(idsToDelete);
  });
}

export async function deleteLocalPatternDatabaseForTests(): Promise<void> {
  localPatternDb.close();
  await Dexie.delete(localPatternDbName);
  localPatternDb = new LocalPatternDb();
}

function isSupportedDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= patternDimensionMin && value <= patternDimensionMax;
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

function isLocalPatternRecord(value: LocalPatternRecord | null): value is LocalPatternRecord {
  return value !== null;
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}
