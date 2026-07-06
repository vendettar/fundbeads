import type { PatternProcessingOptions } from "./pattern-processing";
import type { SourceImageSize } from "./pattern-model";

export type ImageFileToPatternWorkerRequest = {
  type: "image-file-to-pattern/process";
  requestId: string;
  file: File;
  longestEdge: number;
  options: PatternProcessingOptions;
};

export type ImageFileToPatternWorkerResponse =
  | {
      type: "image-file-to-pattern/source-image-size";
      requestId: string;
      sourceImageSize: SourceImageSize;
    }
  | {
      type: "image-file-to-pattern/success";
      requestId: string;
      width: number;
      height: number;
      colorCodes: string[];
    }
  | {
      type: "image-file-to-pattern/fallback";
      requestId: string;
      reason: "offscreen-canvas-unavailable" | "canvas-context-unavailable";
    }
  | {
      type: "image-file-to-pattern/error";
      requestId: string;
      message: string;
    };
