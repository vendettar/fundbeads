import { compositeRgbOverWhite } from "./color-matching";
import type { Rgb } from "./palette";
import { mardPalette } from "./palette";
import { dimensionsForAspectRatio } from "./pattern-dimensions";
import type { Pattern, SourceImageSize } from "./pattern-model";
import {
  defaultSmoothingLevel,
  normalizeSmoothingLevel,
  patternPixelsToPattern,
  type PatternProcessingOptions,
} from "./pattern-processing";

type PatternCanvasContext = (CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) & {
  filter: string;
};

export type PatternCanvas = {
  width: number;
  height: number;
  getContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): PatternCanvasContext | null;
};

export type PatternCanvasFactory = (width: number, height: number) => PatternCanvas;

export type ImageBitmapPatternResult = {
  pattern: Pattern;
  sourceImageSize: SourceImageSize;
};

export function imageBitmapToPattern(
  bitmap: ImageBitmap,
  longestEdge: number,
  createCanvas: PatternCanvasFactory,
  options: PatternProcessingOptions = {},
): ImageBitmapPatternResult {
  const sourceImageSize = { width: bitmap.width, height: bitmap.height };
  const { width, height } = dimensionsForAspectRatio(sourceImageSize, longestEdge);
  const canvas = createCanvas(width, height);
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Could not create canvas context.");
  }

  const smoothingLevel = normalizeSmoothingLevel(options.smoothingLevel ?? defaultSmoothingLevel);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = smoothingLevel >= 2 ? "high" : smoothingLevel === 1 ? "medium" : "low";
  context.filter = smoothingLevel > 0 ? `blur(${(smoothingLevel * 0.35).toFixed(2)}px)` : "none";
  context.clearRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  context.filter = "none";

  const pixels = context.getImageData(0, 0, width, height).data;
  const sourcePixels: Rgb[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3] / 255;
      const sampled = compositeRgbOverWhite({ r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] }, alpha);
      sourcePixels.push(sampled);
    }
  }

  return {
    pattern: patternPixelsToPattern(sourcePixels, { width, height }, mardPalette, options),
    sourceImageSize,
  };
}
