import Dexie, { type Table } from "dexie";

import {
  localPatternDbName,
  localPatternDbVersion,
  localPatternRecordVersion,
  maxLocalPatternListPageSize,
  maxLocalPatternRecords,
  type LocalPatternListOptions,
  type LocalPatternRecord,
  type LocalPatternRecordInput,
  type LocalPatternRecordPage,
  type LocalPatternSaveResult,
} from "./local-pattern-record";
import { normalizeLocalPatternRecord } from "./local-pattern-codec";

export {
  assertRowMajorPattern,
  estimateLocalPatternRecordBytes,
  isRowMajorPattern,
  localPatternRecordToPattern,
  normalizeLocalPatternRecord,
  patternToLocalPatternRecordInput,
} from "./local-pattern-codec";
export {
  localPatternDbName,
  localPatternDbVersion,
  localPatternRecordVersion,
  maxLocalPatternListPageSize,
  maxLocalPatternRecords,
  type LocalPatternListOptions,
  type LocalPatternOwnerScope,
  type LocalPatternRecord,
  type LocalPatternRecordInput,
  type LocalPatternRecordMetadata,
  type LocalPatternRecordPage,
  type LocalPatternSaveResult,
  type LocalPatternSyncStatus,
  type LocalPatternUsage,
} from "./local-pattern-record";

class LocalPatternDb extends Dexie {
  records!: Table<LocalPatternRecord, string>;

  constructor() {
    super(localPatternDbName);

    this.version(localPatternDbVersion).stores({
      records: "id, updatedAt, createdAt, paletteSlug, ownerScope, syncStatus",
    });
  }
}

let localPatternDb = new LocalPatternDb();

export function canUseLocalPatternDb(): boolean {
  return typeof indexedDB !== "undefined" && typeof IDBKeyRange !== "undefined";
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

  const safeOffset = normalizeLocalPatternListOffset(offset);
  const safeLimit = normalizeLocalPatternListLimit(limit);
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

  await localPatternDb.records.delete(id);
}

export async function clearLocalPatternRecords(): Promise<void> {
  if (!canUseLocalPatternDb()) {
    return;
  }

  await localPatternDb.records.clear();
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
  await localPatternDb.records.bulkDelete(idsToDelete);
}

export async function deleteLocalPatternDatabaseForTests(): Promise<void> {
  localPatternDb.close();
  await Dexie.delete(localPatternDbName);
  localPatternDb = new LocalPatternDb();
}

function isLocalPatternRecord(value: LocalPatternRecord | null): value is LocalPatternRecord {
  return value !== null;
}

function normalizeLocalPatternListOffset(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function normalizeLocalPatternListLimit(value: number): number {
  if (value === Number.POSITIVE_INFINITY) {
    return maxLocalPatternListPageSize;
  }
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(maxLocalPatternListPageSize, Math.max(1, Math.trunc(value)));
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}
