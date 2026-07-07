import { imageBitmapToPattern, type PatternCanvas } from "./image-bitmap-to-pattern";
import type { ImageFileToPatternWorkerRequest, ImageFileToPatternWorkerResponse } from "./image-file-to-pattern.worker-types";
import { cellsToPattern, type PatternProcessingOptions } from "./pattern-processing";
import { mardPalette } from "./palette";
import type { Pattern, SourceImageSize } from "./pattern-model";

export async function imageFileToPattern(
  file: File,
  longestEdge: number,
  onSourceImageSize?: (source: SourceImageSize) => void,
  options: PatternProcessingOptions = {},
  abortSignal?: AbortSignal,
): Promise<Pattern> {
  throwIfAborted(abortSignal);
  const reportSourceImageSize = once(onSourceImageSize);

  if (canUseImageProcessingWorker()) {
    const workerResult = await imageFileToPatternInWorker(file, longestEdge, reportSourceImageSize, options, abortSignal);
    if (workerResult.type === "success") {
      return workerResult.pattern;
    }
  }

  return imageFileToPatternOnMainThread(file, longestEdge, reportSourceImageSize, options, abortSignal);
}

export async function imageFileToPatternOnMainThread(
  file: File,
  longestEdge: number,
  onSourceImageSize?: (source: SourceImageSize) => void,
  options: PatternProcessingOptions = {},
  abortSignal?: AbortSignal,
): Promise<Pattern> {
  throwIfAborted(abortSignal);
  const bitmap = await createImageBitmap(file);

  try {
    const { pattern, sourceImageSize } = imageBitmapToPattern(bitmap, longestEdge, createDocumentCanvas, options, abortSignal);
    throwIfAborted(abortSignal);
    onSourceImageSize?.(sourceImageSize);
    return pattern;
  } finally {
    bitmap.close();
  }
}

type ImageFileToPatternWorkerResult =
  | {
      type: "success";
      pattern: Pattern;
    }
  | {
      type: "fallback";
    };

function canUseImageProcessingWorker(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

function imageFileToPatternInWorker(
  file: File,
  longestEdge: number,
  onSourceImageSize: (source: SourceImageSize) => void,
  options: PatternProcessingOptions,
  abortSignal: AbortSignal | undefined,
): Promise<ImageFileToPatternWorkerResult> {
  if (abortSignal?.aborted) {
    return Promise.reject(abortError());
  }

  let worker: Worker;
  try {
    worker = new Worker(new URL("./image-file-to-pattern.worker.ts", import.meta.url), {
      type: "module",
      name: "image-file-to-pattern",
    });
  } catch {
    return Promise.resolve({ type: "fallback" });
  }

  return new Promise((resolve, reject) => {
    const requestId = createWorkerRequestId();
    let settled = false;

    function cleanup() {
      abortSignal?.removeEventListener("abort", abort);
      worker.terminate();
    }

    function settle(result: ImageFileToPatternWorkerResult) {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    }

    function fail(error: Error) {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    }

    function abort() {
      fail(abortError());
    }

    abortSignal?.addEventListener("abort", abort, { once: true });

    worker.onmessage = (event: MessageEvent<ImageFileToPatternWorkerResponse>) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return;
      }

      if (message.type === "image-file-to-pattern/source-image-size") {
        onSourceImageSize(message.sourceImageSize);
        return;
      }

      if (message.type === "image-file-to-pattern/success") {
        try {
          settle({ type: "success", pattern: workerPatternResponseToPattern(message) });
        } catch (error) {
          fail(error instanceof Error ? error : new Error("Image processing worker returned an invalid pattern."));
        }
        return;
      }

      if (message.type === "image-file-to-pattern/fallback") {
        settle({ type: "fallback" });
        return;
      }

      fail(new Error(message.message));
    };

    worker.onerror = () => settle({ type: "fallback" });
    worker.onmessageerror = () => settle({ type: "fallback" });

    const request: ImageFileToPatternWorkerRequest = {
      type: "image-file-to-pattern/process",
      requestId,
      file,
      longestEdge,
      options,
    };
    worker.postMessage(request);
  });
}

function workerPatternResponseToPattern(message: Extract<ImageFileToPatternWorkerResponse, { type: "image-file-to-pattern/success" }>): Pattern {
  const paletteByCode = new Map(mardPalette.map((color) => [color.code, color]));
  const cells = message.colorCodes.map((colorCode, index) => {
    const color = paletteByCode.get(colorCode);
    if (!color) {
      throw new Error(`Image processing worker returned unknown color code ${colorCode}.`);
    }

    return {
      x: (index % message.width) + 1,
      y: Math.floor(index / message.width) + 1,
      color,
    };
  });

  return cellsToPattern(cells, { width: message.width, height: message.height });
}

function createDocumentCanvas(width: number, height: number): PatternCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas as PatternCanvas;
}

function once<T>(callback: ((value: T) => void) | undefined): (value: T) => void {
  let called = false;

  return (value: T) => {
    if (called) {
      return;
    }

    called = true;
    callback?.(value);
  };
}

function createWorkerRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (!signal?.aborted) {
    return;
  }

  throw abortError();
}

function abortError() {
  return new DOMException("Image processing was aborted.", "AbortError");
}
