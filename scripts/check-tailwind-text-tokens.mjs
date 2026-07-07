#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const scanRoots = ["frontend/src"];
const sourceExtensions = new Set([".jsx", ".tsx"]);
const staticArbitraryUtilityPattern = /(?:^|[\s"'`])([!A-Za-z0-9_:/.-]+-\[[^\]\s"'`]+\])(?=$|[\s"'`,])/g;

function extensionOf(filePath) {
  const lastDot = filePath.lastIndexOf(".");
  return lastDot === -1 ? "" : filePath.slice(lastDot);
}

function walk(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (sourceExtensions.has(extensionOf(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];

for (const root of scanRoots) {
  for (const filePath of walk(join(repoRoot, root))) {
    const relativePath = relative(repoRoot, filePath).split(sep).join("/");
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

    for (const [index, line] of lines.entries()) {
      for (const match of line.matchAll(staticArbitraryUtilityPattern)) {
        findings.push(`${relativePath}:${index + 1}: ${match[1]}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Static arbitrary Tailwind utilities are not allowed in JSX.");
  console.error("Use Tailwind scale tokens, named semantic CSS classes, or Tailwind v4 CSS tokens in frontend/src/styles/*.css.");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("Tailwind static arbitrary utility guard passed.");
