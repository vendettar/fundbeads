import { Check, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "./i18n";
import type { Pattern } from "./pattern";

type CopyFeedbackStatus = "copySucceeded" | "copyFailed";
type CopyStatus = { target: "list"; status: CopyFeedbackStatus } | { target: "color"; code: string; status: CopyFeedbackStatus } | null;

function formatUsagePercent(count: number, totalBeads: number) {
  if (totalBeads <= 0) {
    return "0.0%";
  }

  return `${((count / totalBeads) * 100).toFixed(1)}%`;
}

export function formatColorUsageLine(
  usage: Pattern["usage"][number],
  totalBeads: number,
  _paletteLabel: (color: Pattern["usage"][number]["color"]) => string,
  formatNumber: (value: number) => string,
) {
  return `${usage.color.code} x${formatNumber(usage.count)} (${formatUsagePercent(usage.count, totalBeads)})`;
}

export function formatColorUsageList(
  pattern: Pattern,
  _paletteLabel: (color: Pattern["usage"][number]["color"]) => string,
  formatNumber: (value: number) => string,
) {
  return [
    `Fundbeads Pattern ${pattern.width}x${pattern.height} / ${formatNumber(pattern.usage.length)} Colors / Total ${formatNumber(pattern.totalBeads)} Beads`,
    "Code\tCount\tPercent",
    ...pattern.usage.map((usage) => `${usage.color.code}\t${formatNumber(usage.count)}\t${formatUsagePercent(usage.count, pattern.totalBeads)}`),
  ].join("\n");
}

function colorUsageGridColumns(compact: boolean) {
  return compact ? "grid-cols-[minmax(0,1fr)_2rem]" : "grid-cols-[minmax(0,1fr)_3rem]";
}

function colorUsageMeasureColumns(compact: boolean) {
  return compact ? "grid-cols-[minmax(0,1fr)_3.5rem_3.75rem]" : "grid-cols-[minmax(16rem,1fr)_7rem_7rem]";
}

export function ColorUsageDetail({
  className = "",
  pattern,
  onPreviewColorChange,
  onPinnedColorToggle,
  compact = false,
}: {
  className?: string;
  pattern: Pattern;
  onPreviewColorChange: (colorCode: string | null) => void;
  onPinnedColorToggle: (colorCode: string) => string | null;
  compact?: boolean;
}) {
  const { formatNumber, paletteLabel, t } = useI18n();
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [pinnedColorCode, setPinnedColorCode] = useState<string | null>(null);
  const listCopySucceeded = copyStatus?.target === "list" && copyStatus.status === "copySucceeded";
  const listCopyFailed = copyStatus?.target === "list" && copyStatus.status === "copyFailed";

  useEffect(() => {
    if (!copyStatus) {
      return undefined;
    }
    const timer = setTimeout(() => setCopyStatus(null), 1500);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  useEffect(() => {
    setPinnedColorCode(null);
  }, [pattern]);

  async function copyText(text: string, target: { target: "list" } | { target: "color"; code: string }) {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard is not available.");
      }

      await navigator.clipboard.writeText(text);
      setCopyStatus({ ...target, status: "copySucceeded" });
    } catch {
      setCopyStatus({ ...target, status: "copyFailed" });
    }
  }

  function togglePinnedColor(colorCode: string) {
    setPinnedColorCode(onPinnedColorToggle(colorCode));
  }

  return (
    <section className={`color-usage-detail grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-border bg-card p-3 shadow-panel ${className}`} aria-label={t("colorDetailTitle")}>
      <div className="border-b border-border pb-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("colorDetailTitle")}</h3>
          <button
            type="button"
            onClick={() => void copyText(formatColorUsageList(pattern, paletteLabel, formatNumber), { target: "list" })}
            className={[
              "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring scale-75 origin-right",
              listCopySucceeded
                ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                : listCopyFailed
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-background text-foreground",
            ].join(" ")}
          >
            {listCopySucceeded ? <Check size={13} /> : listCopyFailed ? <X size={13} /> : <Copy size={13} />}
            <span>{copyStatus?.target === "list" ? t(copyStatus.status) : t("copyList")}</span>
          </button>
        </div>
        <p className="text-caption-compact mt-1 leading-snug text-muted-foreground">{t("colorDetailHint")}</p>
      </div>
      <div className={compact ? "mt-2 grid max-h-[28vh] overflow-y-auto xl:max-h-none xl:min-h-0" : "mt-2 grid"}>
        <div className={`${compact ? "text-caption-dense px-2" : "px-3 text-xs"} grid ${colorUsageGridColumns(compact)} border-b border-border bg-muted py-2 font-bold uppercase text-muted-foreground`}>
          <span className={`grid ${colorUsageMeasureColumns(compact)}`}>
            <span>{t("colorColumn")}</span>
            <span className="text-right">{t("countColumn")}</span>
            <span className="text-right">{t("percentColumn")}</span>
          </span>
          <span className="sr-only">{t("copyColorLine", { code: "" })}</span>
        </div>
        {pattern.usage.map(({ color, count }) => {
          const isPinned = pinnedColorCode === color.code;
          const colorCopyStatus = copyStatus?.target === "color" && copyStatus.code === color.code ? copyStatus.status : null;
          const colorCopySucceeded = colorCopyStatus === "copySucceeded";
          const colorCopyFailed = colorCopyStatus === "copyFailed";

          return (
            <div
              key={color.code}
              onMouseEnter={() => onPreviewColorChange(color.code)}
              onMouseLeave={() => onPreviewColorChange(null)}
              onFocus={() => onPreviewColorChange(color.code)}
              onBlur={(event) => {
                if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                  onPreviewColorChange(null);
                }
              }}
              className={[
                `grid ${colorUsageGridColumns(compact)} items-stretch border-b border-border transition last:border-b-0 hover:bg-muted focus-within:bg-muted`,
                compact
                  ? "px-2"
                  : "px-3",
                isPinned ? "bg-primary/10 ring-2 ring-inset ring-primary" : "",
              ].join(" ")}
            >
              <button
                type="button"
                aria-pressed={isPinned}
                onClick={() => togglePinnedColor(color.code)}
                className={`grid min-w-0 ${colorUsageMeasureColumns(compact)} items-center py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-7 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }} />
                  <span className="block font-mono text-xs font-bold text-foreground">{color.code}</span>
                </span>
                <span className="text-right font-mono text-xs font-bold text-foreground">{formatNumber(count)}</span>
                <span className="text-right font-mono text-xs font-bold text-muted-foreground">{formatUsagePercent(count, pattern.totalBeads)}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void copyText(formatColorUsageLine({ color, count }, pattern.totalBeads, paletteLabel, formatNumber), { target: "color", code: color.code });
                }}
                className={[
                  "my-auto ml-auto grid size-7 place-items-center rounded-md transition hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                  colorCopySucceeded
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : colorCopyFailed
                      ? "bg-destructive/10 text-destructive"
                      : "text-muted-foreground",
                ].join(" ")}
                aria-label={colorCopyStatus ? t(colorCopyStatus) : t("copyColorLine", { code: color.code })}
                title={colorCopyStatus ? t(colorCopyStatus) : t("copyColorLine", { code: color.code })}
              >
                {colorCopySucceeded ? <Check size={14} /> : colorCopyFailed ? <X size={14} /> : <Copy size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
