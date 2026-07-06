import { imageBitmapToPattern, type PatternCanvas } from "./image-bitmap-to-pattern";
import type { ImageFileToPatternWorkerRequest, ImageFileToPatternWorkerResponse } from "./image-file-to-pattern.worker-types";

type ImagePatternWorkerGlobal = {
  onmessage: ((event: MessageEvent<ImageFileToPatternWorkerRequest>) => void) | null;
  postMessage(message: ImageFileToPatternWorkerResponse): void;
};

const workerSelf = self as unknown as ImagePatternWorkerGlobal;

workerSelf.onmessage = async (event: MessageEvent<ImageFileToPatternWorkerRequest>) => {
  if (event.data.type !== "image-file-to-pattern/process") {
    return;
  }

  const { requestId } = event.data;
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
    postWorkerMessage({ type: "image-file-to-pattern/fallback", requestId, reason: "offscreen-canvas-unavailable" });
    return;
  }

  const { file, longestEdge, options } = event.data;
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
    postWorkerMessage({ type: "image-file-to-pattern/source-image-size", requestId, sourceImageSize: { width: bitmap.width, height: bitmap.height } });

    const { pattern } = imageBitmapToPattern(
      bitmap,
      longestEdge,
      (width, height) => new OffscreenCanvas(width, height) as PatternCanvas,
      options,
    );
    postWorkerMessage({
      type: "image-file-to-pattern/success",
      requestId,
      width: pattern.width,
      height: pattern.height,
      colorCodes: pattern.cells.map((cell) => {
        if (!cell.color) {
          throw new Error("Worker generated a no-bead cell in a complete pattern.");
        }
        return cell.color.code;
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Could not create canvas context.") {
      postWorkerMessage({ type: "image-file-to-pattern/fallback", requestId, reason: "canvas-context-unavailable" });
      return;
    }

    postWorkerMessage({ type: "image-file-to-pattern/error", requestId, message: error instanceof Error ? error.message : "Image processing worker failed." });
  } finally {
    bitmap?.close();
  }
};

function postWorkerMessage(message: ImageFileToPatternWorkerResponse) {
  workerSelf.postMessage(message);
}
