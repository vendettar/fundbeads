import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "./i18n";
import { mard221Palette, mardPalette } from "./palette";

const mardPaletteGroups = mard221Palette.groups.map((group) => ({
  ...group,
  colors: mardPalette.filter((color) => color.family === group.prefix),
}));

const dialogFocusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function PaletteDialog({ onClose }: { onClose: () => void }) {
  const { formatNumber, t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = getDialogFocusableElements(dialogRef.current);
    (closeButtonRef.current ?? focusableElements[0])?.focus();

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const nextFocusableElements = getDialogFocusableElements(dialogRef.current);
      if (nextFocusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = nextFocusableElements[0];
      const lastElement = nextFocusableElements[nextFocusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid bg-black/55 p-3 sm:p-6" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mard-palette-dialog-title"
        className="m-auto grid max-h-[90vh] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-border bg-card shadow-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 id="mard-palette-dialog-title" className="text-lg font-semibold">
              {t("mardPaletteTitle")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("mardPaletteSummary", {
                colors: formatNumber(mard221Palette.colorCount),
                families: formatNumber(mard221Palette.groups.length),
              })}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={t("closeDialog")}
            title={t("closeDialog")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-auto p-4">
          <MardPaletteShowcase />
        </div>
      </section>
    </div>,
    document.body,
  );
}

function getDialogFocusableElements(dialog: HTMLElement | null) {
  if (!dialog) {
    return [];
  }

  return Array.from(dialog.querySelectorAll<HTMLElement>(dialogFocusableSelector)).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
}

function MardPaletteShowcase() {
  const { formatNumber, t } = useI18n();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedCode) {
      return undefined;
    }
    const timer = setTimeout(() => setCopiedCode(null), 1500);
    return () => clearTimeout(timer);
  }, [copiedCode]);

  async function handleCopy(hex: string, code: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(hex.toUpperCase());
        setCopiedCode(code);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-4">
        {mardPaletteGroups.map((group) => (
          <section key={group.prefix} className="border border-border bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-mono text-sm font-bold text-foreground">
                {t("paletteFamilyTitle", { family: group.prefix, count: formatNumber(group.colors.length) })}
              </h3>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
              {group.colors.map((color) => (
                <button
                  key={color.code}
                  type="button"
                  onClick={() => void handleCopy(color.hex, color.code)}
                  className={[
                    "flex min-w-0 items-center text-left gap-2 border bg-card p-2 cursor-pointer transition hover:bg-muted hover-shake w-full focus:outline-none focus:ring-2 focus:ring-ring",
                    copiedCode === color.code ? "border-primary" : "border-border",
                  ].join(" ")}
                  title={t("copyColorLine", { code: color.code })}
                >
                  <span className="size-7 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }} />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-bold text-foreground">{color.code}</span>
                    <span className="text-caption-compact block truncate font-mono text-muted-foreground">
                      {copiedCode === color.code ? t("copySucceeded") : color.hex.toUpperCase()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
