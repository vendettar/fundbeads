import { ImageUp } from "lucide-react";
import type { DragEvent, KeyboardEvent } from "react";

import { useI18n } from "./i18n";

export function UploadWorkspace({
  isDraggingFile,
  isProcessing,
  onDrop,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onKeyDown,
}: {
  isDraggingFile: boolean;
  isProcessing: boolean;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLLabelElement>) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="upload-preview-placeholder h-full border border-border bg-card p-3 shadow-panel" aria-busy={isProcessing}>
      <div
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`upload-preview-canvas grid h-full place-items-center border px-4 py-8 text-center transition sm:px-6 ${
          isDraggingFile ? "border-primary bg-muted shadow-panel" : "border-border bg-background"
        }`}
      >
        <span className="grid w-full max-w-4xl gap-5">
          <label
            htmlFor="image-upload"
            role="button"
            tabIndex={0}
            aria-describedby="upload-dropzone-description"
            onKeyDown={onKeyDown}
            className="upload-preview-frame mx-auto grid w-full max-w-2xl cursor-pointer place-items-center rounded-lg border border-dashed border-border bg-muted p-5 transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className="grid justify-items-center rounded-md border border-border bg-card px-6 py-5 shadow-panel">
              <span className="grid size-16 place-items-center rounded-md border border-border bg-background text-primary">
                <ImageUp size={34} />
              </span>
              <span className="mt-4 text-2xl font-semibold">{t("dropzoneTitle")}</span>
              <span id="upload-dropzone-description" className="mt-2 max-w-lg text-sm text-muted-foreground">
                {t("dropzoneBody")}
              </span>
            </span>
          </label>
          <span className="mx-auto inline-flex rounded-md border border-border bg-card px-3 py-2 text-xs font-bold uppercase text-muted-foreground shadow-panel">
            {isProcessing ? t("processingImage") : t("dropzoneHint")}
          </span>
        </span>
      </div>
    </section>
  );
}
