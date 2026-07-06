#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const distRoot = join(repoRoot, "frontend/dist");
const scannedExtensions = new Set([".css", ".html", ".js", ".svg"]);
const contextRadius = 220;

const primitiveRules = [
  {
    label: "fetch(",
    pattern: /\bfetch\s*\(/g,
    allow: [
      {
        reason: "Vite modulepreload fetches local chunk hrefs.",
        matches: (filePath, context) =>
          /^assets\/index-[\w-]+\.js$/.test(filePath) &&
          /\bfetch\([A-Za-z_$][\w$]*\.href,[A-Za-z_$][\w$]*\)/.test(context) &&
          /\b(referrerPolicy|crossOrigin|integrity)\b/.test(context),
      },
      {
        reason: "canvg image/document helpers are bundled by jsPDF but are not used by Fundbeads export code.",
        matches: (filePath, context) =>
          /^assets\/index\.es-[\w-]+\.js$/.test(filePath) &&
          (/\bcreateImage\([^)]*\)[\s\S]*\byield fetch\(/.test(context) ||
            /\bload\([^)]*\)[\s\S]*\byield [\w$]+\.fetch\(/.test(context) ||
            /\bdocument\.fetch\(/.test(context) ||
            /\bget fetch\(\)\{return this\.screen\.fetch\}/.test(context)),
      },
    ],
  },
  {
    label: "XMLHttpRequest",
    pattern: /\bXMLHttpRequest\b/g,
    allow: [
      {
        reason: "html2canvas dormant helpers are bundled by jsPDF.",
        matches: (filePath) => /^assets\/html2canvas\.esm-[\w-]+\.js$/.test(filePath),
      },
      {
        reason: "jsPDF file/font helpers are bundled but Fundbeads only exports canvas images.",
        matches: (filePath) => /^assets\/jspdf\.es\.min-[\w-]+\.js$/.test(filePath),
      },
    ],
  },
  {
    label: "loadFile",
    pattern: /\bloadFile\b/g,
    allow: [
      {
        reason: "jsPDF file/font helpers are bundled but Fundbeads only exports canvas images.",
        matches: (filePath) => /^assets\/jspdf\.es\.min-[\w-]+\.js$/.test(filePath),
      },
    ],
  },
  { label: "importScripts(", pattern: /\bimportScripts\s*\(/g, allow: [] },
  { label: "remote dynamic import", pattern: /\bimport\s*\(\s*["'](?:https?:)?\/\//g, allow: [] },
  {
    label: "new Worker(",
    pattern: /\bnew\s+Worker\s*\(/g,
    allow: [
      {
        reason: "Vite emits the local image-processing module worker chunk.",
        matches: (filePath, context) =>
          /^assets\/index-[\w-]+\.js$/.test(filePath) &&
          /new Worker\(new URL\("\/assets\/image-file-to-pattern\.worker-[\w-]+\.js",import\.meta\.url\),\{type:"module",name:"image-file-to-pattern"\}\)/.test(context),
      },
    ],
  },
  { label: "SharedWorker", pattern: /\bSharedWorker\b/g, allow: [] },
  { label: "worker object URL", pattern: /\bnew\s+(?:Shared)?Worker\s*\(\s*URL\.createObjectURL\s*\(/g, allow: [] },
  { label: "sendBeacon", pattern: /\bsendBeacon\b/g, allow: [] },
  { label: "WebSocket", pattern: /\bWebSocket\b/g, allow: [] },
  { label: "EventSource", pattern: /\bEventSource\b/g, allow: [] },
  { label: "analytics", pattern: /\banalytics\b/gi, allow: [] },
  { label: "telemetry", pattern: /\btelemetry\b/gi, allow: [] },
  { label: "sentry", pattern: /\bsentry\b/gi, allow: [] },
  { label: "posthog", pattern: /\bposthog\b/gi, allow: [] },
  { label: "gtag", pattern: /\bgtag\b/gi, allow: [] },
];

function extensionOf(filePath) {
  return extname(filePath);
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

    if (scannedExtensions.has(extensionOf(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeContext(source, index) {
  return source
    .slice(Math.max(0, index - contextRadius), Math.min(source.length, index + contextRadius))
    .replace(/\s+/g, " ")
    .trim();
}

if (!existsSync(distRoot)) {
  console.error("frontend/dist does not exist. Run pnpm build:frontend before pnpm dist:check.");
  process.exit(1);
}

const findings = [];
const allowedCounts = new Map();

for (const filePath of walk(distRoot)) {
  const relativePath = relative(distRoot, filePath).split(sep).join("/");
  const source = readFileSync(filePath, "utf8");

  for (const rule of primitiveRules) {
    rule.pattern.lastIndex = 0;

    for (const match of source.matchAll(rule.pattern)) {
      const context = normalizeContext(source, match.index ?? 0);
      const allowance = rule.allow.find((candidate) => candidate.matches(relativePath, context));

      if (allowance) {
        const key = `${rule.label}: ${allowance.reason}`;
        allowedCounts.set(key, (allowedCounts.get(key) ?? 0) + 1);
        continue;
      }

      findings.push(`${relativePath}: unexpected ${rule.label}: ${context}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Production bundle contains unapproved network or telemetry primitives.");
  console.error(findings.join("\n"));
  process.exit(1);
}

const allowanceSummary = [...allowedCounts.entries()].map(([label, count]) => `${label} (${count})`);
console.log(`Dist local-only guard passed${allowanceSummary.length > 0 ? ` with known third-party allowances: ${allowanceSummary.join("; ")}` : "."}`);
