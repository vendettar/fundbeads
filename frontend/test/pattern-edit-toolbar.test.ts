/// <reference types="vite/client" />

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { shouldCloseReplacePanelForPointerTarget } from "../src/pattern-edit-toolbar";
import patternEditToolbarSource from "../src/pattern-edit-toolbar.tsx?raw";
import patternGridSource from "../src/pattern-grid.tsx?raw";

const componentsStyles = readFileSync(new URL("../src/styles/components.css", import.meta.url), "utf8");

function sourceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end < 0) {
    return "";
  }
  return source.slice(start, end);
}

describe("pattern edit toolbar source contract", () => {
  it("uses the replace tool button as the only replace popup trigger", () => {
    expect(patternEditToolbarSource).toContain("pattern-edit-replace-popover");
    expect(patternEditToolbarSource).toContain('aria-controls={tool === "replace" ? "pattern-edit-replace-panel" : undefined}');
    expect(patternEditToolbarSource).toContain("colorGroups.map((group)");
    expect(patternEditToolbarSource).toContain("pattern-replace-color-grid");
    expect(patternEditToolbarSource).not.toContain("onReplacePanelToggle");
    expect(patternGridSource).not.toContain("onReplacePanelToggle");
  });

  it("anchors the replace popup to the replace tool button left edge", () => {
    expect(patternEditToolbarSource).toContain("pattern-edit-replace-anchor relative inline-flex");
    expect(patternEditToolbarSource.indexOf("pattern-edit-replace-anchor")).toBeLessThan(patternEditToolbarSource.indexOf("pattern-edit-replace-popover"));
  });

  it("closes the replace popup for outside pointer targets only", () => {
    const insideTarget = new EventTarget();
    const outsideTarget = new EventTarget();
    const anchor = {
      contains: (target: EventTarget) => target === insideTarget,
    };

    expect(shouldCloseReplacePanelForPointerTarget(anchor, insideTarget)).toBe(false);
    expect(shouldCloseReplacePanelForPointerTarget(anchor, outsideTarget)).toBe(true);
    expect(shouldCloseReplacePanelForPointerTarget(anchor, null)).toBe(true);
  });

  it("wires replace popup outside click and escape dismissal", () => {
    expect(patternEditToolbarSource).toContain('document.addEventListener("pointerdown", onDocumentPointerDown)');
    expect(patternEditToolbarSource).toContain('document.addEventListener("keydown", onDocumentKeyDown)');
    expect(patternEditToolbarSource).toContain('event.key === "Escape"');
    expect(patternEditToolbarSource).toContain("onReplacePanelClose");
  });

  it("does not use native browser selects inside the replace popover", () => {
    const replacePickerSource = patternEditToolbarSource.slice(patternEditToolbarSource.indexOf("function PatternReplaceColorPicker"));

    expect(replacePickerSource).not.toContain("<select");
    expect(replacePickerSource).not.toContain("<option");
    expect(replacePickerSource).toContain('role="radiogroup"');
    expect(replacePickerSource).toContain('role="radio"');
  });

  it("uses a custom grouped MARD grid popup for active color selection", () => {
    const activeColorSource = sourceBetween(patternEditToolbarSource, "pattern-edit-active-color-panel", "<div className=\"inline-flex items-center");

    expect(patternEditToolbarSource).not.toContain("<select");
    expect(patternEditToolbarSource).not.toContain("<option");
    expect(patternEditToolbarSource).toContain("pattern-active-color-anchor relative inline-flex");
    expect(patternEditToolbarSource).toContain("pattern-active-color-popover");
    expect(patternEditToolbarSource).toContain("getPatternReplaceColorGroups(mardPalette, mard221Palette.groups)");
    expect(patternEditToolbarSource).toContain("activeColorGroups.map((group)");
    expect(patternEditToolbarSource).toContain("pattern-active-color-grid");
    expect(patternEditToolbarSource).toContain("aria-pressed={isSelected}");
    expect(activeColorSource).not.toContain('role="radiogroup"');
    expect(activeColorSource).not.toContain('role="radio"');
    expect(activeColorSource).not.toContain("onColorRadioKeyDown");
  });

  it("renders replace color swatches as square blocks", () => {
    const colorDotRule = componentsStyles.match(/\.pattern-replace-color-dot\s*\{[^}]+\}/)?.[0] ?? "";

    expect(colorDotRule).toContain("width: 1.25rem");
    expect(colorDotRule).toContain("height: 1.25rem");
    expect(colorDotRule).not.toContain("border-radius");
  });

  it("freezes each replace color picker header inside its scroll area", () => {
    const pickerHeaderRule = componentsStyles.match(/\.pattern-replace-color-picker-header\s*\{[^}]+\}/)?.[0] ?? "";

    expect(patternEditToolbarSource).toContain("pattern-replace-color-picker-header");
    expect(pickerHeaderRule).toContain("position: sticky");
    expect(pickerHeaderRule).toContain("top: 0");
    expect(pickerHeaderRule).toContain("z-index: var(--beads-layer-popover)");
  });
});
