#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const scanRoots = ["frontend/src"];
const sourceExtensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);
const arbitraryTextPattern = /(?:^|[\s"'`])([!A-Za-z0-9_:/.[\]()%=-]*text-\[[^\]\s"'`]+\])(?=$|[\s"'`,])/g;

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
      for (const match of line.matchAll(arbitraryTextPattern)) {
        findings.push(`${relativePath}:${index + 1}: ${match[1]}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Arbitrary Tailwind text-size utilities are not allowed.");
  console.error("Use Tailwind scale tokens such as text-xs/text-sm, or add a named semantic CSS class for dense UI cases.");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("Tailwind text-size token guard passed.");
