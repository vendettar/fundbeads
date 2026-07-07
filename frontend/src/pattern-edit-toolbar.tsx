import { Check, ChevronDown, Eraser, Eye, Paintbrush, Pipette, Redo2, Replace, RotateCcw, Undo2 } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "./i18n";
import { mard221Palette, mardPalette, type BeadColor } from "./palette";
import type { ColorUsage } from "./pattern-model";
import type { PatternEditState, PatternEditTool } from "./pattern-edit";
import { getPatternReplaceColorGroups, type PatternReplaceColorGroup } from "./pattern-replace-options";

type ReplaceStatusKey = "patternEditReplaceNoSource";

type PatternEditControlsProps = {
  editState: PatternEditState;
  activeColor: BeadColor;
  sourceUsage: ColorUsage[];
  replaceSourceColorGroups: PatternReplaceColorGroup[];
  replaceTargetColorGroups: PatternReplaceColorGroup[];
  canUndo: boolean;
  canRedo: boolean;
  hasManualEdits: boolean;
  isReplacePanelOpen: boolean;
  replaceSourceCode: string;
  replaceTargetCode: string;
  replaceSourceColor?: BeadColor;
  replaceTargetColor?: BeadColor;
  replaceStatusKey: ReplaceStatusKey | null;
  canApplyReplace: boolean;
  onToolSelect: (tool: PatternEditTool) => void;
  onActiveColorSelect: (colorCode: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onReplaceSourceChange: (colorCode: string) => void;
  onReplaceTargetChange: (colorCode: string) => void;
  onApplyReplace: () => void;
  onReplacePanelClose: () => void;
};

export function shouldCloseReplacePanelForPointerTarget(anchor: { contains: (target: EventTarget) => boolean } | null, target: EventTarget | null) {
  return !target || !anchor || !anchor.contains(target);
}

function onColorRadioKeyDown(event: KeyboardEvent<HTMLButtonElement>, colorCode: string, colorCodes: readonly string[], onColorSelect: (colorCode: string) => void) {
  const currentIndex = colorCodes.indexOf(colorCode);
  if (currentIndex < 0) {
    return;
  }

  let nextIndex: number | null = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = Math.min(colorCodes.length - 1, currentIndex + 1);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = Math.max(0, currentIndex - 1);
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = colorCodes.length - 1;
  }

  if (nextIndex === null) {
    return;
  }

  event.preventDefault();
  const nextCode = colorCodes[nextIndex];
  onColorSelect(nextCode);

  const radioGroup = event.currentTarget.closest<HTMLElement>("[data-color-radio-grid]");
  const focusNextRadio = () => {
    radioGroup?.querySelector<HTMLButtonElement>(`[data-color-radio-code="${nextCode}"]`)?.focus();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(focusNextRadio);
  } else {
    focusNextRadio();
  }
}

export function PatternEditControls({
  editState,
  activeColor,
  sourceUsage,
  replaceSourceColorGroups,
  replaceTargetColorGroups,
  canUndo,
  canRedo,
  hasManualEdits,
  isReplacePanelOpen,
  replaceSourceCode,
  replaceTargetCode,
  replaceSourceColor,
  replaceTargetColor,
  replaceStatusKey,
  canApplyReplace,
  onToolSelect,
  onActiveColorSelect,
  onUndo,
  onRedo,
  onReset,
  onReplaceSourceChange,
  onReplaceTargetChange,
  onApplyReplace,
  onReplacePanelClose,
}: PatternEditControlsProps) {
  const { formatNumber, paletteLabel, t } = useI18n();
  const replaceAnchorRef = useRef<HTMLSpanElement>(null);
  const activeColorAnchorRef = useRef<HTMLSpanElement>(null);
  const [isActiveColorPanelOpen, setIsActiveColorPanelOpen] = useState(false);
  const activeColorGroups = useMemo(() => getPatternReplaceColorGroups(mardPalette, mard221Palette.groups), []);
  const sourceUsageByCode = new Map(sourceUsage.map(({ color, count }) => [color.code, count]));
  const toolButtons = [
    { tool: "view" as const, label: t("patternEditView"), icon: <Eye size={14} /> },
    { tool: "paint" as const, label: t("patternEditPaint"), icon: <Paintbrush size={14} /> },
    { tool: "pick" as const, label: t("patternEditPick"), icon: <Pipette size={14} /> },
    { tool: "erase" as const, label: t("patternEditErase"), icon: <Eraser size={14} /> },
    { tool: "replace" as const, label: t("patternEditReplace"), icon: <Replace size={14} /> },
  ];

  useEffect(() => {
    if (!isReplacePanelOpen) {
      return undefined;
    }

    function onDocumentPointerDown(event: PointerEvent) {
      const anchor = replaceAnchorRef.current;
      const pointerAnchor: { contains: (target: EventTarget) => boolean } | null = anchor
        ? { contains: (target: EventTarget) => target instanceof Node && anchor.contains(target) }
        : null;

      if (shouldCloseReplacePanelForPointerTarget(pointerAnchor, event.target)) {
        onReplacePanelClose();
      }
    }

    function onDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onReplacePanelClose();
      }
    }

    document.addEventListener("pointerdown", onDocumentPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [isReplacePanelOpen, onReplacePanelClose]);

  useEffect(() => {
    if (!isActiveColorPanelOpen) {
      return undefined;
    }

    function onDocumentPointerDown(event: PointerEvent) {
      const anchor = activeColorAnchorRef.current;
      const pointerAnchor: { contains: (target: EventTarget) => boolean } | null = anchor
        ? { contains: (target: EventTarget) => target instanceof Node && anchor.contains(target) }
        : null;

      if (shouldCloseReplacePanelForPointerTarget(pointerAnchor, event.target)) {
        setIsActiveColorPanelOpen(false);
      }
    }

    function onDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActiveColorPanelOpen(false);
      }
    }

    document.addEventListener("pointerdown", onDocumentPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [isActiveColorPanelOpen]);

  function selectActiveColorFromPanel(colorCode: string) {
    onActiveColorSelect(colorCode);
    setIsActiveColorPanelOpen(false);
  }

  function toggleActiveColorPanel() {
    setIsActiveColorPanelOpen((isOpen) => {
      if (!isOpen && isReplacePanelOpen) {
        onReplacePanelClose();
      }
      return !isOpen;
    });
  }

  return (
    <div className="pattern-edit-toolbar flex flex-wrap items-center gap-2" aria-label={t("patternEditToolbar")}>
      <div className="pattern-edit-tool-group relative inline-flex min-w-0 items-center rounded-md border border-border bg-background p-1">
        {toolButtons.map(({ tool, label, icon }) => {
          const toolButton = (
            <button
              key={tool}
              type="button"
              aria-pressed={editState.tool === tool}
              aria-expanded={tool === "replace" ? isReplacePanelOpen : undefined}
              aria-controls={tool === "replace" ? "pattern-edit-replace-panel" : undefined}
              title={label}
              onClick={() => onToolSelect(tool)}
              className={`inline-flex h-8 min-w-0 items-center gap-1 rounded px-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
                editState.tool === tool ? "bg-secondary text-secondary-foreground shadow-panel" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          );

          if (tool !== "replace") {
            return toolButton;
          }

          return (
            <span key={tool} ref={replaceAnchorRef} className="pattern-edit-replace-anchor relative inline-flex">
              {toolButton}
              {isReplacePanelOpen ? (
                <div id="pattern-edit-replace-panel" role="dialog" aria-label={t("patternEditReplace")} className="pattern-edit-replace-popover grid gap-3 rounded-md border border-border bg-background p-3 shadow-panel">
                  <PatternReplaceColorPicker
                    label={t("patternEditReplaceSource")}
                    selectedColor={replaceSourceColor}
                    selectedColorCode={replaceSourceCode}
                    colorGroups={replaceSourceColorGroups}
                    usageByCode={sourceUsageByCode}
                    emptyMessage={t("patternEditReplaceNoSource")}
                    onColorSelect={onReplaceSourceChange}
                  />
                  <PatternReplaceColorPicker
                    label={t("patternEditReplaceTarget")}
                    selectedColor={replaceTargetColor}
                    selectedColorCode={replaceTargetCode}
                    colorGroups={replaceTargetColorGroups}
                    onColorSelect={onReplaceTargetChange}
                  />
                  <button
                    type="button"
                    disabled={!canApplyReplace}
                    onClick={onApplyReplace}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check size={14} />
                    <span>{t("patternEditApplyReplace")}</span>
                  </button>
                  {replaceStatusKey ? <p className="text-xs font-semibold text-muted-foreground">{t(replaceStatusKey)}</p> : null}
                </div>
              ) : null}
            </span>
          );
        })}
      </div>

      <span ref={activeColorAnchorRef} className="pattern-active-color-anchor relative inline-flex min-w-0">
        <button
          type="button"
          aria-expanded={isActiveColorPanelOpen}
          aria-controls="pattern-edit-active-color-panel"
          onClick={toggleActiveColorPanel}
          className="inline-flex h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className="size-5 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${activeColor.r} ${activeColor.g} ${activeColor.b})` }} />
          <span className="hidden sm:inline">{t("patternEditActiveColor")}</span>
          <span className="font-mono text-foreground">{activeColor.code}</span>
          <ChevronDown size={14} />
        </button>
        {isActiveColorPanelOpen ? (
          <div id="pattern-edit-active-color-panel" role="dialog" aria-label={t("patternEditActiveColor")} className="pattern-active-color-popover grid gap-3 rounded-md border border-border bg-background p-3 shadow-panel">
            <section className="pattern-active-color-picker grid min-w-0 gap-2" aria-label={t("patternEditActiveColor")}>
              <div className="pattern-active-color-picker-header flex min-w-0 items-center gap-2">
                <span className="size-7 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${activeColor.r} ${activeColor.g} ${activeColor.b})` }} />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-muted-foreground">{t("patternEditActiveColor")}</span>
                  <span className="block font-mono text-xs font-bold text-foreground">{activeColor.code}</span>
                </span>
              </div>
              <div className="grid gap-2" aria-label={t("patternEditActiveColor")}>
                {activeColorGroups.map((group) => (
                  <section key={group.family} className="grid gap-1">
                    <h4 className="text-caption-dense font-mono font-bold uppercase text-muted-foreground">{t("paletteFamilyTitle", { family: group.family, count: formatNumber(group.colors.length) })}</h4>
                    <div className="pattern-active-color-grid grid gap-1">
                      {group.colors.map((color) => {
                        const isSelected = editState.activeColorCode === color.code;

                        return (
                          <button
                            key={color.code}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => selectActiveColorFromPanel(color.code)}
                            title={`${color.code} ${paletteLabel(color)}`}
                            className={[
                              "pattern-active-color-tile grid min-w-0 place-items-center gap-1 border bg-card p-1 text-center transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                              isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground",
                            ].join(" ")}
                          >
                            <span className="pattern-active-color-dot border border-black/30" style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }} />
                            <span className="text-caption-dense font-mono font-bold leading-none">{color.code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </span>

      <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("patternEditUndo")}
          title={t("patternEditUndo")}
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("patternEditRedo")}
          title={t("patternEditRedo")}
        >
          <Redo2 size={15} />
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasManualEdits}
          className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("patternEditReset")}
          title={t("patternEditReset")}
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}

function PatternReplaceColorPicker({
  label,
  selectedColor,
  selectedColorCode,
  colorGroups,
  usageByCode,
  emptyMessage,
  onColorSelect,
}: {
  label: string;
  selectedColor?: BeadColor;
  selectedColorCode: string;
  colorGroups: PatternReplaceColorGroup[];
  usageByCode?: ReadonlyMap<string, number>;
  emptyMessage?: string;
  onColorSelect: (colorCode: string) => void;
}) {
  const { paletteLabel } = useI18n();
  const colorCodes = useMemo(() => colorGroups.flatMap((group) => group.colors.map((color) => color.code)), [colorGroups]);

  return (
    <section className="pattern-replace-color-picker grid min-w-0 gap-2" aria-label={label}>
      <div className="pattern-replace-color-picker-header flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-7 shrink-0 border border-black/30" style={{ backgroundColor: selectedColor ? `rgb(${selectedColor.r} ${selectedColor.g} ${selectedColor.b})` : "transparent" }} />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-muted-foreground">{label}</span>
            <span className="block font-mono text-xs font-bold text-foreground">{selectedColor?.code ?? "--"}</span>
          </span>
        </div>
      </div>
      {colorGroups.length === 0 ? (
        <p className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid gap-2" role="radiogroup" aria-label={label} data-color-radio-grid>
          {colorGroups.map((group) => (
            <ReplaceColorGroupGrid
              key={group.family}
              group={group}
              colorCodes={colorCodes}
              selectedColorCode={selectedColorCode}
              usageByCode={usageByCode}
              paletteLabel={paletteLabel}
              onColorSelect={onColorSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReplaceColorGroupGrid({
  group,
  colorCodes,
  selectedColorCode,
  usageByCode,
  paletteLabel,
  onColorSelect,
}: {
  group: PatternReplaceColorGroup;
  colorCodes: readonly string[];
  selectedColorCode: string;
  usageByCode?: ReadonlyMap<string, number>;
  paletteLabel: (color: BeadColor) => string;
  onColorSelect: (colorCode: string) => void;
}) {
  const { formatNumber, t } = useI18n();

  return (
    <section className="grid gap-1">
      <h4 className="text-caption-dense font-mono font-bold uppercase text-muted-foreground">{t("paletteFamilyTitle", { family: group.family, count: formatNumber(group.colors.length) })}</h4>
      <div className="pattern-replace-color-grid grid gap-1">
        {group.colors.map((color) => {
          const count = usageByCode?.get(color.code);
          const isSelected = selectedColorCode === color.code;

          return (
            <button
              key={color.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              data-color-radio-code={color.code}
              onClick={() => onColorSelect(color.code)}
              onKeyDown={(event) => onColorRadioKeyDown(event, color.code, colorCodes, onColorSelect)}
              title={`${color.code} ${paletteLabel(color)}${count === undefined ? "" : ` x${formatNumber(count)}`}`}
              className={[
                "pattern-replace-color-tile grid min-w-0 place-items-center gap-1 border bg-card p-1 text-center transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground",
              ].join(" ")}
            >
              <span className="pattern-replace-color-dot border border-black/30" style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }} />
              <span className="text-caption-dense font-mono font-bold leading-none">{color.code}</span>
              {count === undefined ? null : <span className="pattern-replace-color-count font-mono font-bold leading-none text-muted-foreground">x{formatNumber(count)}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
