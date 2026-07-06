import { Palette } from "lucide-react";

import { ColorUsageDetail } from "./color-usage-detail";
import { useI18n } from "./i18n";
import type { Pattern } from "./pattern";

function ImagePreview({ fileName, previewUrl }: { fileName: string; previewUrl: string }) {
  const { t } = useI18n();

  return (
    <section className="border border-border bg-card p-3 shadow-panel">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2 className="text-sm font-semibold">{t("originalPreviewTitle")}</h2>
        <span className="truncate text-xs font-semibold text-muted-foreground">{fileName}</span>
      </div>
      <div className="mt-3 grid place-items-center overflow-hidden bg-background">
        <img src={previewUrl} alt={t("originalPreviewAlt", { fileName })} className="original-preview-image block max-h-[36vh] max-w-full object-contain" />
      </div>
    </section>
  );
}

export function PatternSideRail({
  fileName,
  pattern,
  previewUrl,
  onPreviewColorChange,
  onPinnedColorToggle,
}: {
  fileName: string;
  pattern: Pattern;
  previewUrl: string;
  onPreviewColorChange: (colorCode: string | null) => void;
  onPinnedColorToggle: (colorCode: string) => string | null;
}) {
  return (
    <aside className="grid gap-3 xl:h-full xl:min-h-0 xl:self-stretch xl:grid-rows-[auto_auto_minmax(0,1fr)]">
      <ImagePreview fileName={fileName} previewUrl={previewUrl} />
      <PatternStatsCard pattern={pattern} />
      <ColorUsageDetail className="xl:h-full xl:min-h-0" pattern={pattern} onPreviewColorChange={onPreviewColorChange} onPinnedColorToggle={onPinnedColorToggle} compact />
    </aside>
  );
}

function PatternStatsCard({ pattern }: { pattern: Pattern }) {
  const { formatNumber, t } = useI18n();

  return (
    <section className="pattern-side-stats border border-border bg-card p-3 shadow-panel" aria-label={t("summaryTitle")}>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Palette size={16} />
        <h2 className="text-sm font-semibold">{t("summaryTitle")}</h2>
      </div>
      <p className="mt-3 font-mono text-sm font-bold text-foreground">{t("headerStats", { colors: formatNumber(pattern.usage.length), total: formatNumber(pattern.totalBeads) })}</p>
    </section>
  );
}
