import { FileImage, FileText, Hash, PanelsTopLeft, TableCellsSplit } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n } from "./i18n";
import type { PatternPreviewOption, PatternPreviewOptions } from "./pattern-grid-geometry";

export type PatternExportFormat = "png" | "pdf";

type PatternPreviewToolbarProps = {
  previewOptions: PatternPreviewOptions;
  exportFormat: PatternExportFormat | null;
  exportFailed: boolean;
  onPreviewOptionToggle: (option: PatternPreviewOption) => void;
  onExportPattern: (format: PatternExportFormat) => void;
};

export function PatternPreviewToolbar({
  previewOptions,
  exportFormat,
  exportFailed,
  onPreviewOptionToggle,
  onExportPattern,
}: PatternPreviewToolbarProps) {
  const { t } = useI18n();
  const previewControls: { option: PatternPreviewOption; label: string; icon: ReactNode }[] = [
    { option: "showGrid", label: t("patternPreviewShowGrid"), icon: <TableCellsSplit size={14} /> },
    { option: "showCodes", label: t("patternPreviewShowCodes"), icon: <Hash size={14} /> },
    { option: "showAxes", label: t("patternPreviewShowAxes"), icon: <PanelsTopLeft size={14} /> },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("patternPreviewToolbar")}>
      <div className="flex flex-wrap items-center gap-2">
        {previewControls.map(({ option, label, icon }) => (
          <button
            key={option}
            type="button"
            aria-pressed={previewOptions[option]}
            title={label}
            onClick={() => onPreviewOptionToggle(option)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
              previewOptions[option] ? "bg-secondary text-secondary-foreground shadow-panel" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {exportFailed ? <span className="text-xs font-semibold text-muted-foreground">{t("patternExportFailed")}</span> : null}
        <button
          type="button"
          disabled={exportFormat !== null}
          title={t("patternExportPng")}
          onClick={() => onExportPattern("png")}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-bold text-secondary-foreground shadow-panel transition focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileImage size={14} />
          <span>{exportFormat === "png" ? t("patternExporting") : t("patternExportPng")}</span>
        </button>
        <button
          type="button"
          disabled={exportFormat !== null}
          title={t("patternExportPdf")}
          onClick={() => onExportPattern("pdf")}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-bold text-secondary-foreground shadow-panel transition focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText size={14} />
          <span>{exportFormat === "pdf" ? t("patternExporting") : t("patternExportPdf")}</span>
        </button>
      </div>
    </div>
  );
}
