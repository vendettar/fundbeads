import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultColorDistanceMode,
  defaultDitherMode,
  defaultMaxColorCount,
  defaultSmoothingLevel,
  imageFileToPattern,
  normalizeColorDistanceMode,
  normalizeDitherMode,
  normalizeMaxColorCount,
  normalizePatternDimension,
  normalizeSmoothingLevel,
  patternLongestEdgePresets,
  type ColorDistanceMode,
  type DitherMode,
  type MaxColorCount,
  type Pattern,
  type PatternProcessingOptions,
  type SourceImageSize,
} from "./pattern";

const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const acceptedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"] as const;
const dimensionReprocessDelayMs = 140;

export type PatternProcessingErrorKey = "unsupportedImage" | "processFailed";

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

type UsePatternProcessingOptions = {
  onPatternProcessed: (pattern: Pattern) => void;
  onPatternCleared: () => void;
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

function samePatternProcessingOptions(first: PatternProcessingOptions, second: PatternProcessingOptions) {
  return (
    first.colorDistanceMode === second.colorDistanceMode &&
    first.ditherMode === second.ditherMode &&
    first.smoothingLevel === second.smoothingLevel &&
    first.maxColorCount === second.maxColorCount
  );
}

export function usePatternProcessing({ onPatternProcessed, onPatternCleared }: UsePatternProcessingOptions) {
  const [longestEdge, setLongestEdge] = useState(patternLongestEdgePresets[0]);
  const [fileName, setFileName] = useState("");
  const [errorKey, setErrorKey] = useState<PatternProcessingErrorKey | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sourceImageSize, setSourceImageSize] = useState<SourceImageSize | null>(null);
  const [colorDistanceMode, setColorDistanceMode] = useState<ColorDistanceMode>(defaultColorDistanceMode);
  const [ditherMode, setDitherMode] = useState<DitherMode>(defaultDitherMode);
  const [smoothingLevel, setSmoothingLevel] = useState(defaultSmoothingLevel);
  const [maxColorCount, setMaxColorCount] = useState<MaxColorCount>(defaultMaxColorCount);
  const activeFileRef = useRef<File | null>(null);
  const processRunIdRef = useRef(0);
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

  const processFile = useCallback(
    async (file: File, nextLongestEdge: number, { refreshPreview = true, processingOptions: nextProcessingOptions = processingOptions }: ProcessFileOptions = {}) => {
      clearPendingDimensionReprocess();
      const processRunId = processRunIdRef.current + 1;
      processRunIdRef.current = processRunId;
      const normalizedLongestEdge = normalizePatternDimension(nextLongestEdge);

      if (!isAcceptedImageFile(file)) {
        activeFileRef.current = null;
        setErrorKey("unsupportedImage");
        onPatternCleared();
        setSourceImageSize(null);
        setFileName("");
        setIsProcessing(false);
        clearPreviewUrl();
        return;
      }

      activeFileRef.current = file;
      setIsProcessing(true);
      setErrorKey(null);
      setFileName(file.name);
      if (refreshPreview) {
        setSourceImageSize(null);
        updatePreviewUrl(file);
      }

      try {
        const nextPattern = await imageFileToPattern(
          file,
          normalizedLongestEdge,
          (nextSourceImageSize) => {
            if (processRunIdRef.current === processRunId) {
              setSourceImageSize(nextSourceImageSize);
            }
          },
          nextProcessingOptions,
        );
        if (processRunIdRef.current === processRunId) {
          onPatternProcessed(nextPattern);
        }
      } catch {
        if (processRunIdRef.current === processRunId) {
          activeFileRef.current = null;
          onPatternCleared();
          setSourceImageSize(null);
          clearPreviewUrl();
          setErrorKey("processFailed");
        }
      } finally {
        if (processRunIdRef.current === processRunId) {
          setIsProcessing(false);
        }
      }
    },
    [clearPendingDimensionReprocess, clearPreviewUrl, onPatternCleared, onPatternProcessed, processingOptions, updatePreviewUrl],
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

      if (activeFileRef.current) {
        schedulePatternReprocess(longestEdge, normalizedOptions);
      }
    },
    [colorDistanceMode, ditherMode, longestEdge, maxColorCount, processingOptions, schedulePatternReprocess, smoothingLevel],
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
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      clearPendingDimensionReprocess();
    };
  }, [clearPendingDimensionReprocess]);

  return {
    longestEdge,
    fileName,
    errorKey,
    isProcessing,
    isDraggingFile,
    previewUrl,
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
  };
}
