import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  imageFileToPattern,
  normalizeColorDistanceMode,
  normalizeDitherMode,
  normalizeMaxColorCount,
  normalizePatternDimension,
  normalizeSmoothingLevel,
  type ColorDistanceMode,
  type DitherMode,
  type MaxColorCount,
  type Pattern,
  type PatternProcessingOptions,
  type SourceImageSize,
} from "./pattern";
import { defaultPatternPreferences, normalizePatternPreferences, readStoredPatternPreferences, writeStoredPatternPreferences, type PatternPreferences } from "./pattern-preferences";

const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const acceptedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const maxUploadFileSizeBytes = 10 * 1024 * 1024;
const dimensionReprocessDelayMs = 140;

export type PatternProcessingErrorKey = "unsupportedImage" | "fileTooLarge" | "processFailed";

export type ProcessFileOptions = {
  refreshPreview?: boolean;
  processingOptions?: PatternProcessingOptions;
};

export type LongestEdgeChangeOptions = {
  reprocess?: "immediate" | "deferred";
};

export type PatternAdjustmentOptions = {
  colorDistanceMode: ColorDistanceMode;
  ditherMode: DitherMode;
  smoothingLevel: number;
  maxColorCount: MaxColorCount;
};

export type PatternWorkspaceRestoreInput = {
  sourceFile: File;
  sourceImageSize: SourceImageSize | null;
  preferences: PatternPreferences;
  pattern: Pattern;
};

type UsePatternProcessingOptions = {
  onPatternProcessed: (pattern: Pattern) => void;
  onPatternCleared: () => void;
};

export type ProcessedPatternWorkspace = {
  sourceFile: File;
  sourceImageSize: SourceImageSize | null;
  pattern: Pattern;
  preferences: PatternPreferences;
};

export function isAcceptedImageFile(file: Pick<File, "name" | "type">) {
  const mimeType = file.type.toLowerCase();
  if (acceptedImageMimeTypes.some((acceptedType) => acceptedType === mimeType)) {
    return true;
  }

  if (mimeType !== "") {
    return false;
  }

  const fileName = file.name.toLowerCase();
  return acceptedImageExtensions.some((extension) => fileName.endsWith(extension));
}

export function isWithinUploadFileSizeLimit(file: Pick<File, "size">) {
  return file.size <= maxUploadFileSizeBytes;
}

function samePatternProcessingOptions(first: PatternProcessingOptions, second: PatternProcessingOptions) {
  return (
    first.colorDistanceMode === second.colorDistanceMode &&
    first.ditherMode === second.ditherMode &&
    first.smoothingLevel === second.smoothingLevel &&
    first.maxColorCount === second.maxColorCount
  );
}

export function usePatternProcessing({ onPatternProcessed, onPatternCleared }: UsePatternProcessingOptions) {
  const [initialPreferences] = useState(() => readStoredPatternPreferences() ?? defaultPatternPreferences);
  const [longestEdge, setLongestEdge] = useState(initialPreferences.longestEdge);
  const [fileName, setFileName] = useState("");
  const [errorKey, setErrorKey] = useState<PatternProcessingErrorKey | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sourceImageSize, setSourceImageSize] = useState<SourceImageSize | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [processedWorkspace, setProcessedWorkspace] = useState<ProcessedPatternWorkspace | null>(null);
  const [colorDistanceMode, setColorDistanceMode] = useState<ColorDistanceMode>(initialPreferences.colorDistanceMode);
  const [ditherMode, setDitherMode] = useState<DitherMode>(initialPreferences.ditherMode);
  const [smoothingLevel, setSmoothingLevel] = useState(initialPreferences.smoothingLevel);
  const [maxColorCount, setMaxColorCount] = useState<MaxColorCount>(initialPreferences.maxColorCount);
  const activeFileRef = useRef<File | null>(null);
  const processRunIdRef = useRef(0);
  const processingAbortControllerRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef("");
  const pendingDimensionTimerRef = useRef<number | null>(null);
  const dragDepthRef = useRef(0);

  const processingOptions = useMemo(
    () => ({ colorDistanceMode, ditherMode, smoothingLevel, maxColorCount }),
    [colorDistanceMode, ditherMode, maxColorCount, smoothingLevel],
  );

  const clearPendingDimensionReprocess = useCallback(() => {
    if (pendingDimensionTimerRef.current === null) {
      return;
    }
    window.clearTimeout(pendingDimensionTimerRef.current);
    pendingDimensionTimerRef.current = null;
  }, []);

  const clearPreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    setPreviewUrl("");
  }, []);

  const updatePreviewUrl = useCallback((file: File) => {
    const nextPreviewUrl = URL.createObjectURL(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
  }, []);

  const cancelActiveProcessing = useCallback(() => {
    processingAbortControllerRef.current?.abort();
    processingAbortControllerRef.current = null;
  }, []);

  const processFile = useCallback(
    async (file: File, nextLongestEdge: number, { refreshPreview = true, processingOptions: nextProcessingOptions = processingOptions }: ProcessFileOptions = {}) => {
      clearPendingDimensionReprocess();
      cancelActiveProcessing();
      const processRunId = processRunIdRef.current + 1;
      processRunIdRef.current = processRunId;
      const abortController = new AbortController();
      processingAbortControllerRef.current = abortController;
      const normalizedLongestEdge = normalizePatternDimension(nextLongestEdge);

      if (!isAcceptedImageFile(file)) {
        cancelActiveProcessing();
        activeFileRef.current = null;
        setSourceFile(null);
        setProcessedWorkspace(null);
        setErrorKey("unsupportedImage");
        onPatternCleared();
        setSourceImageSize(null);
        setFileName("");
        setIsProcessing(false);
        clearPreviewUrl();
        return;
      }

      if (!isWithinUploadFileSizeLimit(file)) {
        cancelActiveProcessing();
        activeFileRef.current = null;
        setSourceFile(null);
        setProcessedWorkspace(null);
        setErrorKey("fileTooLarge");
        onPatternCleared();
        setSourceImageSize(null);
        setFileName("");
        setIsProcessing(false);
        clearPreviewUrl();
        return;
      }

      activeFileRef.current = file;
      setSourceFile(file);
      setIsProcessing(true);
      setErrorKey(null);
      setFileName(file.name);
      if (refreshPreview) {
        setSourceImageSize(null);
        updatePreviewUrl(file);
      }

      try {
        let processedSourceImageSize: SourceImageSize | null = null;
        const nextPattern = await imageFileToPattern(
          file,
          normalizedLongestEdge,
          (nextSourceImageSize) => {
            processedSourceImageSize = nextSourceImageSize;
            if (processRunIdRef.current === processRunId) {
              setSourceImageSize(nextSourceImageSize);
            }
          },
          nextProcessingOptions,
          abortController.signal,
        );
        if (processRunIdRef.current === processRunId) {
          setProcessedWorkspace({
            sourceFile: file,
            sourceImageSize: processedSourceImageSize,
            pattern: nextPattern,
            preferences: normalizePatternPreferences({
              longestEdge: normalizedLongestEdge,
              colorDistanceMode: nextProcessingOptions.colorDistanceMode,
              ditherMode: nextProcessingOptions.ditherMode,
              smoothingLevel: nextProcessingOptions.smoothingLevel,
              maxColorCount: nextProcessingOptions.maxColorCount,
            }) ?? defaultPatternPreferences,
          });
          onPatternProcessed(nextPattern);
        }
      } catch (error) {
        if (isAbortError(error) && processRunIdRef.current !== processRunId) {
          return;
        }

        if (processRunIdRef.current === processRunId) {
          activeFileRef.current = null;
          setSourceFile(null);
          setProcessedWorkspace(null);
          onPatternCleared();
          setSourceImageSize(null);
          clearPreviewUrl();
          setErrorKey("processFailed");
        }
      } finally {
        if (processRunIdRef.current === processRunId) {
          processingAbortControllerRef.current = null;
          setIsProcessing(false);
        }
      }
    },
    [cancelActiveProcessing, clearPendingDimensionReprocess, clearPreviewUrl, onPatternCleared, onPatternProcessed, processingOptions, updatePreviewUrl],
  );

  const schedulePatternReprocess = useCallback(
    (nextLongestEdge: number, nextProcessingOptions: PatternProcessingOptions = processingOptions) => {
      clearPendingDimensionReprocess();

      pendingDimensionTimerRef.current = window.setTimeout(() => {
        pendingDimensionTimerRef.current = null;
        const file = activeFileRef.current;
        if (file) {
          void processFile(file, nextLongestEdge, { refreshPreview: false, processingOptions: nextProcessingOptions });
        }
      }, dimensionReprocessDelayMs);
    },
    [clearPendingDimensionReprocess, processFile, processingOptions],
  );

  const onFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await processFile(file, longestEdge, { processingOptions });
      }
    },
    [longestEdge, processFile, processingOptions],
  );

  const onLongestEdgeChange = useCallback(
    async (nextLongestEdge: number, { reprocess = "deferred" }: LongestEdgeChangeOptions = {}) => {
      const normalizedLongestEdge = normalizePatternDimension(nextLongestEdge);
      if (normalizedLongestEdge === longestEdge) {
        clearPendingDimensionReprocess();
        return;
      }

      setLongestEdge(normalizedLongestEdge);
      writeStoredPatternPreferences(undefined, { longestEdge: normalizedLongestEdge, ...processingOptions });

      const file = activeFileRef.current;
      if (!file) {
        clearPendingDimensionReprocess();
        return;
      }

      if (reprocess === "immediate") {
        await processFile(file, normalizedLongestEdge, { refreshPreview: false, processingOptions });
        return;
      }

      schedulePatternReprocess(normalizedLongestEdge, processingOptions);
    },
    [clearPendingDimensionReprocess, longestEdge, processFile, processingOptions, schedulePatternReprocess],
  );

  const onPatternAdjustmentChange = useCallback(
    (nextOptions: Partial<PatternAdjustmentOptions>) => {
      const normalizedOptions = {
        colorDistanceMode: normalizeColorDistanceMode(nextOptions.colorDistanceMode ?? colorDistanceMode),
        ditherMode: normalizeDitherMode(nextOptions.ditherMode ?? ditherMode),
        smoothingLevel: normalizeSmoothingLevel(nextOptions.smoothingLevel ?? smoothingLevel),
        maxColorCount: normalizeMaxColorCount(nextOptions.maxColorCount ?? maxColorCount),
      };

      if (samePatternProcessingOptions(normalizedOptions, processingOptions)) {
        return;
      }

      setColorDistanceMode(normalizedOptions.colorDistanceMode);
      setDitherMode(normalizedOptions.ditherMode);
      setSmoothingLevel(normalizedOptions.smoothingLevel);
      setMaxColorCount(normalizedOptions.maxColorCount);
      writeStoredPatternPreferences(undefined, { longestEdge, ...normalizedOptions });

      if (activeFileRef.current) {
        schedulePatternReprocess(longestEdge, normalizedOptions);
      }
    },
    [colorDistanceMode, ditherMode, longestEdge, maxColorCount, processingOptions, schedulePatternReprocess, smoothingLevel],
  );

  const restorePatternWorkspace = useCallback(
    ({ sourceFile: nextSourceFile, sourceImageSize: nextSourceImageSize, preferences, pattern }: PatternWorkspaceRestoreInput) => {
      const restoredPreferences = normalizePatternPreferences(preferences) ?? defaultPatternPreferences;
      clearPendingDimensionReprocess();
      cancelActiveProcessing();
      processRunIdRef.current += 1;
      activeFileRef.current = nextSourceFile;
      setSourceFile(nextSourceFile);
      setErrorKey(null);
      setIsProcessing(false);
      setFileName(nextSourceFile.name);
      setSourceImageSize(nextSourceImageSize);
      setLongestEdge(restoredPreferences.longestEdge);
      setColorDistanceMode(restoredPreferences.colorDistanceMode);
      setDitherMode(restoredPreferences.ditherMode);
      setSmoothingLevel(restoredPreferences.smoothingLevel);
      setMaxColorCount(restoredPreferences.maxColorCount);
      setProcessedWorkspace({
        sourceFile: nextSourceFile,
        sourceImageSize: nextSourceImageSize,
        pattern,
        preferences: restoredPreferences,
      });
      writeStoredPatternPreferences(undefined, restoredPreferences);
      updatePreviewUrl(nextSourceFile);
    },
    [cancelActiveProcessing, clearPendingDimensionReprocess, updatePreviewUrl],
  );

  const onFileDrop = useCallback(
    async (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFile(false);
      const file = event.dataTransfer.files[0];
      if (file) {
        await processFile(file, longestEdge, { processingOptions });
      }
    },
    [longestEdge, processFile, processingOptions],
  );

  const onFileDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    dragDepthRef.current += 1;
    setIsDraggingFile(true);
  }, []);

  const onFileDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingFile(true);
  }, []);

  const onFileDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      processRunIdRef.current += 1;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      cancelActiveProcessing();
      clearPendingDimensionReprocess();
    };
  }, [cancelActiveProcessing, clearPendingDimensionReprocess]);

  return {
    longestEdge,
    fileName,
    errorKey,
    isProcessing,
    isDraggingFile,
    previewUrl,
    sourceFile,
    processedWorkspace,
    sourceImageSize,
    colorDistanceMode,
    ditherMode,
    smoothingLevel,
    maxColorCount,
    processingOptions,
    onFileChange,
    onFileDrop,
    onFileDragEnter,
    onFileDragOver,
    onFileDragLeave,
    onLongestEdgeChange,
    onPatternAdjustmentChange,
    restorePatternWorkspace,
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
