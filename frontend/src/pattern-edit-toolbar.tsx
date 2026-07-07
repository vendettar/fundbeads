import { Check, Eraser, Eye, Paintbrush, Pipette, Redo2, Replace, RotateCcw, Undo2 } from "lucide-react";

import { useI18n } from "./i18n";
import { mardPalette, type BeadColor } from "./palette";
import type { ColorUsage } from "./pattern-model";
import type { PatternEditState, PatternEditTool } from "./pattern-edit";

type ReplaceStatusKey = "patternEditReplaceNoSource";

type PatternEditControlsProps = {
  editState: PatternEditState;
  activeColor: BeadColor;
  sourceUsage: ColorUsage[];
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
  onReplacePanelToggle: () => void;
  onReplaceSourceChange: (colorCode: string) => void;
  onReplaceTargetChange: (colorCode: string) => void;
  onApplyReplace: () => void;
};

export function PatternEditControls({
  editState,
  activeColor,
  sourceUsage,
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
  onReplacePanelToggle,
  onReplaceSourceChange,
  onReplaceTargetChange,
  onApplyReplace,
}: PatternEditControlsProps) {
  const { paletteLabel, t } = useI18n();
  const toolButtons = [
    { tool: "view" as const, label: t("patternEditView"), icon: <Eye size={14} /> },
    { tool: "paint" as const, label: t("patternEditPaint"), icon: <Paintbrush size={14} /> },
    { tool: "pick" as const, label: t("patternEditPick"), icon: <Pipette size={14} /> },
    { tool: "erase" as const, label: t("patternEditErase"), icon: <Eraser size={14} /> },
    { tool: "replace" as const, label: t("patternEditReplace"), icon: <Replace size={14} /> },
  ];

  return (
    <>
      <div className="pattern-edit-toolbar flex flex-wrap items-center gap-2" aria-label={t("patternEditToolbar")}>
        <div className="inline-flex min-w-0 items-center rounded-md border border-border bg-background p-1">
          {toolButtons.map(({ tool, label, icon }) => (
            <button
              key={tool}
              type="button"
              aria-pressed={editState.tool === tool}
              title={label}
              onClick={() => onToolSelect(tool)}
              className={`inline-flex h-8 min-w-0 items-center gap-1 rounded px-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-ring ${
                editState.tool === tool ? "bg-secondary text-secondary-foreground shadow-panel" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <label className="inline-flex h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-bold text-muted-foreground">
          <span className="size-5 shrink-0 border border-black/30" style={{ backgroundColor: `rgb(${activeColor.r} ${activeColor.g} ${activeColor.b})` }} />
          <span className="hidden sm:inline">{t("patternEditActiveColor")}</span>
          <span className="font-mono text-foreground">{activeColor.code}</span>
          <select
            value={editState.activeColorCode}
            onChange={(event) => onActiveColorSelect(event.target.value)}
            className="h-7 min-w-24 rounded border border-border bg-card px-1 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={t("patternEditActiveColor")}
          >
            {mardPalette.map((color) => (
              <option key={color.code} value={color.code}>
                {color.code} {paletteLabel(color)}
              </option>
            ))}
          </select>
        </label>

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

        <button
          type="button"
          onClick={onReplacePanelToggle}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-bold text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          aria-expanded={isReplacePanelOpen}
          aria-controls="pattern-edit-replace-panel"
        >
          <Replace size={14} />
          <span>{t("patternEditReplace")}</span>
        </button>
      </div>

      {isReplacePanelOpen ? (
        <div id="pattern-edit-replace-panel" className="pattern-edit-replace-panel grid gap-2 border-b border-border bg-background px-3 py-2 sm:items-end">
          <label className="grid min-w-0 gap-1 text-xs font-bold text-muted-foreground">
            <span>{t("patternEditReplaceSource")}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-7 shrink-0 border border-black/30"
                style={{ backgroundColor: replaceSourceColor ? `rgb(${replaceSourceColor.r} ${replaceSourceColor.g} ${replaceSourceColor.b})` : "transparent" }}
              />
              <select
                value={replaceSourceCode}
                onChange={(event) => onReplaceSourceChange(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {sourceUsage.map(({ color, count }) => (
                  <option key={color.code} value={color.code}>
                    {color.code} {paletteLabel(color)} x{count}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-bold text-muted-foreground">
            <span>{t("patternEditReplaceTarget")}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-7 shrink-0 border border-black/30"
                style={{ backgroundColor: replaceTargetColor ? `rgb(${replaceTargetColor.r} ${replaceTargetColor.g} ${replaceTargetColor.b})` : "transparent" }}
              />
              <select
                value={replaceTargetCode}
                onChange={(event) => onReplaceTargetChange(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {mardPalette.map((color) => (
                  <option key={color.code} value={color.code}>
                    {color.code} {paletteLabel(color)}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <button
            type="button"
            disabled={!canApplyReplace}
            onClick={onApplyReplace}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} />
            <span>{t("patternEditApplyReplace")}</span>
          </button>
          {replaceStatusKey ? <p className="text-xs font-semibold text-muted-foreground sm:col-span-3">{t(replaceStatusKey)}</p> : null}
        </div>
      ) : null}
    </>
  );
}
