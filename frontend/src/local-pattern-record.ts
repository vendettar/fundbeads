import { mard221Palette } from "./palette";

export const localPatternDbName = "fundbeads-pattern-store";
export const localPatternDbVersion = 1;
export const localPatternRecordVersion = 1;
export const maxLocalPatternRecords = 100;
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
  cellCodes: Array<string | null>;
  usage: LocalPatternUsage[];
  totalBeads: number;
  usedColorCount: number;
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
