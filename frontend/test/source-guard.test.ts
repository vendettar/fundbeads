/// <reference types="vite/client" />

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const clientSourceModules = import.meta.glob<string>("../src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });
const clientSourceFiles = Object.entries(clientSourceModules)
  .map(([path, source]) => [path.replace("../src/", ""), source] as const)
  .sort(([left], [right]) => left.localeCompare(right));
const localPatternPersistenceSources = clientSourceFiles.filter(([sourceFile]) => ["local-pattern-codec.ts", "local-pattern-db.ts", "local-pattern-record.ts"].includes(sourceFile));
const cssSourceFiles = [
  "styles.css",
  "styles/base.css",
  "styles/components.css",
  "styles/pattern-grid.css",
  "styles/interface-styles.css",
] as const;
const cssSources = cssSourceFiles.map((filePath) => [filePath, readFileSync(new URL(`../src/${filePath}`, import.meta.url), "utf8")] as const);
const jsxSourceFiles = clientSourceFiles.filter(([sourceFile]) => sourceFile.endsWith(".tsx"));

describe("client-only source guard", () => {
  it("covers every frontend source module", () => {
    const sourceFileNames = clientSourceFiles.map(([sourceFile]) => sourceFile);

    expect(sourceFileNames).toContain("color-matching.ts");
    expect(sourceFileNames).toContain("color-usage-detail.tsx");
    expect(sourceFileNames).toContain("dither.ts");
    expect(sourceFileNames).toContain("image-bitmap-to-pattern.ts");
    expect(sourceFileNames).toContain("image-file-to-pattern.browser.ts");
    expect(sourceFileNames).toContain("image-file-to-pattern.worker-types.ts");
    expect(sourceFileNames).toContain("image-file-to-pattern.worker.ts");
    expect(sourceFileNames).toContain("i18n-data.ts");
    expect(sourceFileNames).toContain("max-color.ts");
    expect(sourceFileNames).toContain("palette-dialog.tsx");
    expect(sourceFileNames).toContain("pattern-model.ts");
    expect(sourceFileNames).toContain("pattern-processing.ts");
    expect(sourceFileNames).toContain("pattern-side-rail.tsx");
    expect(sourceFileNames).toContain("pattern-export.ts");
    expect(sourceFileNames).toContain("pattern-edit-toolbar.tsx");
    expect(sourceFileNames).toContain("pattern-grid.tsx");
    expect(sourceFileNames).toContain("pattern-grid-board.tsx");
    expect(sourceFileNames).toContain("pattern-grid-geometry.ts");
    expect(sourceFileNames).toContain("pattern-grid-interaction.ts");
    expect(sourceFileNames).toContain("pattern-render-model.ts");
    expect(sourceFileNames).toContain("pattern-preview-toolbar.tsx");
    expect(sourceFileNames).toContain("preference-select.tsx");
    expect(sourceFileNames).toContain("upload-workspace.tsx");
    expect(sourceFileNames).toContain("use-pattern-processing.ts");
    expect(sourceFileNames).toEqual(expect.arrayContaining(["local-pattern-codec.ts", "local-pattern-db.ts", "local-pattern-record.ts"]));
  });

  it("does not introduce remote network, telemetry, or analytics APIs", () => {
    const forbiddenPatterns = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bsendBeacon\b/,
      /\bWebSocket\b/,
      /\bEventSource\b/,
      /\banalytics\b/i,
      /\btelemetry\b/i,
      /\bsentry\b/i,
      /\bposthog\b/i,
      /\bgtag\b/i,
      /https?:\/\//i,
    ];

    for (const [sourceFile, source] of clientSourceFiles) {
      for (const pattern of forbiddenPatterns) {
        expect(source, `${sourceFile} should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("keeps image processing workers bundled and local", () => {
    const imageProcessingSources = clientSourceFiles.filter(([sourceFile]) => sourceFile.startsWith("image-file-to-pattern") || sourceFile === "image-bitmap-to-pattern.ts");

    for (const [sourceFile, source] of imageProcessingSources) {
      expect(source, `${sourceFile} should not load remote worker scripts`).not.toMatch(/new\s+Worker\s*\(\s*["'`]https?:/i);
      expect(source, `${sourceFile} should not create blob workers`).not.toMatch(/URL\.createObjectURL\s*\(\s*new\s+Blob/i);
      expect(source, `${sourceFile} should not use classic worker importScripts`).not.toMatch(/\bimportScripts\s*\(/);
    }
  });

  it("keeps local pattern persistence free of account authority concepts", () => {
    const forbiddenPatterns = [/\bpassword\b/i, /\bsession\b/i, /\btoken\b/i, /\bauth\b/i, /\blogin\b/i, /\bemail\b/i];

    for (const [sourceFile, source] of localPatternPersistenceSources) {
      for (const pattern of forbiddenPatterns) {
        expect(source, `${sourceFile} should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("keeps app CSS free of remote asset loading", () => {
    const forbiddenPatterns = [/@import\s+url\(/i, /@import\s+["']https?:/i, /https?:\/\//i, /\burl\(/i, /\bcdn\b/i];

    for (const [sourceFile, source] of cssSources) {
      for (const pattern of forbiddenPatterns) {
        expect(source, `${sourceFile} should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("keeps the global CSS entrypoint limited to approved files", () => {
    expect(cssSourceFiles).toEqual([
      "styles.css",
      "styles/base.css",
      "styles/components.css",
      "styles/pattern-grid.css",
      "styles/interface-styles.css",
    ]);

    expect(cssSources[0][1].trim().split(/\r?\n/)).toEqual([
      '@import "tailwindcss";',
      '@import "./design-theme.generated.css";',
      '@import "./styles/base.css";',
      '@import "./styles/components.css";',
      '@import "./styles/pattern-grid.css";',
      '@import "./styles/interface-styles.css";',
    ]);
  });

  it("keeps static arbitrary Tailwind utilities out of JSX", () => {
    const forbiddenStaticArbitraryUtilityPattern = /\b(?:[a-z][\w-]*:)*!?[a-z][\w-]*-\[[^\]\s"'`]+\]/g;

    for (const [sourceFile, source] of jsxSourceFiles) {
      expect(source, `${sourceFile} should use named CSS primitives instead of arbitrary Tailwind utilities`).not.toMatch(forbiddenStaticArbitraryUtilityPattern);
    }
  });

  it("keeps overlay layering on named CSS classes instead of raw z-index utilities", () => {
    const forbiddenZIndexUtilityPattern = /(?:^|[\s"'`])(?:[a-z][\w-]*:)*!?z-(?:\d+|\[[^\]\s"'`]+\])(?=$|[\s"'`])/;
    const forbiddenInlineZIndexPattern = /\bzIndex\s*[:=]/;
    const cssZIndexDeclarationPattern = /z-index:\s*([^;]+);/g;
    const componentCss = cssSources.find(([sourceFile]) => sourceFile === "styles/components.css")?.[1] ?? "";
    const baseCss = cssSources.find(([sourceFile]) => sourceFile === "styles/base.css")?.[1] ?? "";

    expect(baseCss).toContain("--beads-layer-popover");
    expect(baseCss).toContain("--beads-layer-modal");
    expect(componentCss).toContain(".preference-select-menu");
    expect(componentCss).toContain("z-index: var(--beads-layer-popover)");
    expect(componentCss).toContain(".layer-modal-backdrop");
    expect(componentCss).toContain("z-index: var(--beads-layer-modal)");

    for (const [sourceFile, source] of jsxSourceFiles) {
      expect(source, `${sourceFile} should not use raw z-index utilities`).not.toMatch(forbiddenZIndexUtilityPattern);
      expect(source, `${sourceFile} should not use inline zIndex`).not.toMatch(forbiddenInlineZIndexPattern);
    }

    for (const [sourceFile, source] of cssSources) {
      for (const match of source.matchAll(cssZIndexDeclarationPattern)) {
        expect(match[1].trim(), `${sourceFile} should use layer variables for z-index`).toMatch(/^var\(--beads-layer-[^)]+\)$/);
      }
    }
  });
});
