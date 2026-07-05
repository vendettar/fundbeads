import { readFileSync, writeFileSync } from "node:fs";
import { lint } from "@google/design.md/linter";

const sourcePath = "DESIGN.md";
const outputPath = "frontend/src/design-theme.generated.css";

const source = readFileSync(sourcePath, "utf8");
const report = lint(source);
const errors = report.findings.filter((finding) => finding.severity === "error");

if (errors.length > 0) {
  for (const error of errors) {
    const location = error.path ? `${error.path}: ` : "";
    console.error(`${location}${error.message}`);
  }
  process.exit(1);
}

const theme = report.tailwindConfig?.data?.theme?.extend ?? {};
const colors = theme.colors ?? {};
const fontFamilies = theme.fontFamily ?? {};

const colorTokenNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "muted",
  "muted-foreground",
  "border",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "destructive",
  "destructive-foreground",
  "accent",
  "accent-foreground",
  "ring",
];

function requireToken(collection, tokenName) {
  const value = collection[tokenName];
  if (!value) {
    throw new Error(`Missing required DESIGN.md token: ${tokenName}`);
  }
  return value;
}

function quoteFontFamily(name) {
  if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-.+)$/.test(name)) {
    return name;
  }
  return `"${name.replaceAll('"', '\\"')}"`;
}

function fontStack(tokenName, fallbacks) {
  const tokenValue = fontFamilies[tokenName];
  const families = Array.isArray(tokenValue) ? tokenValue : tokenValue ? [tokenValue] : [];
  const uniqueFamilies = [...new Set([...families, ...fallbacks])];
  return uniqueFamilies.map(quoteFontFamily).join(", ");
}

const lines = [
  "/* Generated from DESIGN.md by scripts/generate-design-theme.mjs. */",
  "/* Do not edit directly; run `pnpm design:generate`. */",
  "",
  ":root {",
];

for (const tokenName of colorTokenNames) {
  lines.push(`  --beads-${tokenName}: ${requireToken(colors, tokenName)};`);
}

lines.push(`  --beads-font-sans: ${fontStack("body", ["Avenir Next", "Trebuchet MS", "sans-serif"])};`);
lines.push(`  --beads-font-mono: ${fontStack("code", ["SFMono-Regular", "Menlo", "monospace"])};`);
lines.push("  --beads-shadow-panel: 0 18px 45px rgb(67 55 26 / 0.14);");
lines.push("}");
lines.push("");

writeFileSync(outputPath, `${lines.join("\n")}\n`);
