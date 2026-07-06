#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};
const assetCacheHeader = "public, max-age=31536000, immutable";
const exactPagesRedirects = "/* /index.html 200";

const files = {
  dockerfile: readText("Dockerfile"),
  nginx: readText("nginx.conf"),
  viteConfig: readText("frontend/vite.config.ts"),
  pagesHeaders: readText("frontend/public/_headers"),
  pagesRedirects: readText("frontend/public/_redirects"),
  dockerignore: readText(".dockerignore"),
  compose: readText("docker-compose.yml"),
  ci: readText(".github/workflows/pr-ci.yml"),
  packageJson: JSON.parse(readText("package.json")),
};

const findings = [];
const pagesHeaderRoutes = parsePagesHeaders(files.pagesHeaders);

requireIncludes(files.dockerfile, "FROM node:24-bookworm AS frontend-builder", "Dockerfile should build with the same Node major used by CI.");
requireIncludes(files.dockerfile, "FROM nginx:1.27-alpine AS runtime", "Dockerfile should serve the app from the pinned nginx runtime image.");
requireIncludes(files.dockerfile, "COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./", "Dockerfile should copy root package and workspace manifests before install.");
requireIncludes(files.dockerfile, "COPY frontend/package.json ./frontend/package.json", "Dockerfile should copy the frontend manifest before install.");
requireIncludes(files.dockerfile, "corepack enable && pnpm install --frozen-lockfile", "Dockerfile should install from the committed lockfile.");
requireIncludes(files.dockerfile, "COPY DESIGN.md ./DESIGN.md", "Dockerfile should copy DESIGN.md for token generation.");
requireIncludes(files.dockerfile, "COPY scripts ./scripts", "Dockerfile should copy build scripts.");
requireIncludes(files.dockerfile, "COPY frontend ./frontend", "Dockerfile should copy frontend source.");
requireIncludes(files.dockerfile, "RUN pnpm design:generate && pnpm build:frontend", "Dockerfile should regenerate design tokens and build static frontend assets.");
requireIncludes(files.dockerfile, "COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html", "Docker runtime should copy only built static frontend output.");
requireIncludes(files.dockerfile, "COPY nginx.conf /etc/nginx/conf.d/default.conf", "Docker runtime should install the project nginx static config.");
requireIncludes(files.dockerfile, "EXPOSE 80", "Docker runtime should expose nginx port 80.");
requireNotMatches(files.dockerfile, /FROM\s+.+\s+AS\s+runtime[\s\S]*(pnpm|npm|node|vite|tsx|ts-node)\b/i, "Docker runtime stage should not run application tooling.");

requireIncludes(files.nginx, "listen 80;", "nginx should listen on port 80.");
requireIncludes(files.nginx, "root /usr/share/nginx/html;", "nginx should serve the static frontend directory.");
requireIncludes(files.nginx, "index index.html;", "nginx should use index.html as the static app entrypoint.");
requireIncludes(files.nginx, "try_files $uri $uri/ /index.html;", "nginx should preserve SPA fallback routing.");
requireIncludes(files.nginx, "try_files $uri =404;", "nginx asset route should not fall back missing assets to index.html.");
for (const [headerName, expectedValue] of Object.entries(securityHeaders)) {
  requireNginxHeader(headerName, expectedValue);
}
requireNotMatches(files.nginx, /\b(proxy_pass|fastcgi_pass|uwsgi_pass|scgi_pass|grpc_pass)\b/i, "nginx should not proxy to a backend.");
requireNotMatches(files.nginx, /location\s+[^{}]*(\/api|\/upload|\/graphql|\/ws)\b/i, "nginx should not define backend-style API routes.");

requirePagesRoute("/*");
for (const [headerName, expectedValue] of Object.entries(securityHeaders)) {
  requirePagesRouteHeader("/*", headerName, expectedValue);
}
requirePagesRoute("/assets/*");
requirePagesRouteHeader("/assets/*", "Cache-Control", assetCacheHeader);
requireExactPagesRedirects();
requireNotMatches(files.pagesRedirects, /\bhttps?:\/\//i, "Cloudflare Pages _redirects should not point to remote origins.");
requireNotMatches(files.pagesRedirects, /\b(\/api|\/upload|\/graphql|\/ws)\b/i, "Cloudflare Pages _redirects should not define backend-style routes.");

requireNotMatches(files.viteConfig, /\bpublicDir\s*:/, "Vite config should use the default public directory so frontend/public is copied.");
requireNotMatches(files.viteConfig, /\bcopyPublicDir\s*:\s*false\b/, "Vite config should not disable copying frontend/public.");
requireNotMatches(files.viteConfig, /\bbase\s*:\s*["'](?:https?:)?\/\//i, "Vite config should not set a remote base URL.");
requireNotMatches(files.viteConfig, /\boutDir\s*:/, "Vite config should keep the default build output directory frontend/dist.");
requireNotMatches(files.viteConfig, /\bproxy\s*:/, "Vite config should not define a backend proxy.");

for (const forbiddenPath of [
  "functions",
  "frontend/functions",
  "frontend/public/_worker.js",
  "frontend/public/_routes.json",
  "wrangler.toml",
  "wrangler.json",
  "wrangler.jsonc",
  "frontend/wrangler.toml",
  "frontend/wrangler.json",
  "frontend/wrangler.jsonc",
]) {
  requireMissingPath(forbiddenPath);
}

requireBuiltCopy("frontend/dist/_headers", files.pagesHeaders);
requireBuiltCopy("frontend/dist/_redirects", files.pagesRedirects);

for (const ignoredPath of [
  ".git",
  "node_modules",
  "frontend/node_modules",
  "frontend/dist",
  "test-results",
  "frontend/test-results",
  ".pnpm-store",
  "*.tsbuildinfo",
  "/local",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.cert",
  ".npmrc",
]) {
  requireDockerignore(ignoredPath);
}
for (const requiredInput of ["Dockerfile", "nginx.conf", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "DESIGN.md", "scripts", "frontend"]) {
  forbidDockerignore(requiredInput);
}

requireMatches(files.compose, /^services:\s*\n\s{2}fundbeads:/m, "docker-compose should define the fundbeads service.");
requireIncludes(files.compose, "context: .", "docker-compose should build from the repository root.");
requireIncludes(files.compose, "dockerfile: Dockerfile", "docker-compose should use the project Dockerfile.");
requireIncludes(files.compose, '"3000:80"', "docker-compose should expose nginx port 80 on local port 3000.");
requireNotMatches(files.compose, /\bvolumes\s*:/, "docker-compose should not mount source files into the static runtime container.");
requireNotMatches(files.compose, /\benvironment\s*:/, "docker-compose static runtime should not require environment variables.");
requireNotMatches(files.compose, /\benv_file\s*:/, "docker-compose static runtime should not require env files.");
requireNotMatches(files.compose, /\bdepends_on\s*:/, "docker-compose static runtime should not depend on backend services.");

requirePackageValue("packageManager", "pnpm@11.9.0");
requireIncludes(files.ci, "version: 11.9.0", "PR CI should use the package manager version declared in package.json.");
requireIncludes(files.ci, "node-version: 24", "PR CI should use the Docker builder Node major.");
requireIncludes(files.ci, "run: pnpm check", "PR CI should run pnpm check before Docker build.");
requireIncludes(files.ci, "docker build -t fundbeads:ci .", "PR CI should build the Docker image.");
requireIncludes(files.ci, "docker run --rm -d -p 8080:80 --name fundbeads-ci fundbeads:ci", "PR CI should start the Docker runtime for smoke testing.");
requireIncludes(files.ci, "curl --retry 10 --retry-delay 1 --retry-connrefused -fsS http://127.0.0.1:8080/", "PR CI should smoke test the running nginx container.");
requireIncludes(files.ci, "content-security-policy:", "PR CI should assert CSP header presence.");
requireIncludes(files.ci, "x-content-type-options: nosniff", "PR CI should assert nosniff header presence.");
requireIncludes(files.ci, "referrer-policy: no-referrer", "PR CI should assert referrer policy header presence.");
requireIncludes(files.ci, "permissions-policy:", "PR CI should assert permissions policy header presence.");

requirePackageScript("runtime:check", "node scripts/check-static-runtime.mjs");
requirePackageScript("dist:check", "node scripts/check-dist-local-only.mjs");
requirePackageScript("check", "pnpm design:generate && pnpm design:lint && pnpm build:frontend && pnpm runtime:check && pnpm dist:check && pnpm test:frontend");

const runtimeDocs = readText("docs/runtime-and-deployment.md");
requireIncludes(runtimeDocs, "node:24-bookworm", "Runtime docs should match the Docker builder image.");
requireIncludes(runtimeDocs, "nginx:1.27-alpine", "Runtime docs should match the Docker runtime image.");
requireIncludes(runtimeDocs, "frontend/dist", "Runtime docs should name the static build output.");
requireIncludes(runtimeDocs, "frontend/public/_headers", "Runtime docs should document Cloudflare Pages static headers.");
requireIncludes(runtimeDocs, "frontend/public/_redirects", "Runtime docs should document Cloudflare Pages SPA fallback redirects.");
requireIncludes(runtimeDocs, "pnpm build:frontend` before `pnpm runtime:check", "Runtime docs should explain that Pages output validation requires a built frontend.");
requireIncludes(runtimeDocs, "/usr/share/nginx/html", "Runtime docs should name the nginx static root.");
requireIncludes(runtimeDocs, "port `3000` to container port `80`", "Runtime docs should document the compose port mapping.");
for (const claim of [
  "The runtime container is static-only.",
  "There are no API routes.",
  "There is no image upload endpoint.",
  "There is no server-side database or server-side persistence.",
  "There is no remote translation, remote theme, telemetry, CDN, or analytics dependency.",
]) {
  requireIncludes(runtimeDocs, claim, `Runtime docs should include deployment contract claim: ${claim}`);
}

const deploymentDocs = readText("docs/deployment.md");
requireIncludes(deploymentDocs, "frontend/public/_headers", "Deployment docs should mention the Cloudflare Pages security headers file.");
requireIncludes(deploymentDocs, "frontend/public/_redirects", "Deployment docs should mention the Cloudflare Pages SPA redirects file.");
requireIncludes(deploymentDocs, "pnpm design:generate && pnpm build:frontend", "Deployment docs should lock the Cloudflare Pages build command.");
requireIncludes(deploymentDocs, "frontend/dist", "Deployment docs should lock the Cloudflare Pages build output directory.");
requireIncludes(deploymentDocs, "Production branch | `release`", "Deployment docs should lock the Cloudflare Pages production branch.");
requireIncludes(deploymentDocs, "Root directory | `/`", "Deployment docs should lock the Cloudflare Pages root directory.");
requireIncludes(deploymentDocs, "CSP", "Deployment docs should call out the Cloudflare Pages CSP contract.");
requireIncludes(deploymentDocs, "Node.js version | `24`", "Deployment docs should keep the Cloudflare Pages Node version at 24.");

if (findings.length > 0) {
  console.error("Static runtime guard failed.");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("Static runtime guard passed.");

function readText(filePath) {
  return readFileSync(join(repoRoot, filePath), "utf8");
}

function requireIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    findings.push(`${message} Missing: ${expected}`);
  }
}

function requireNotMatches(source, pattern, message) {
  if (pattern.test(source)) {
    findings.push(message);
  }
}

function requireMatches(source, pattern, message) {
  if (!pattern.test(source)) {
    findings.push(message);
  }
}

function requireNginxHeader(headerName, expectedValue) {
  const escapedHeader = headerName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const headerPattern = new RegExp(`add_header\\s+${escapedHeader}\\s+"([^"]+)"\\s+always;`, "i");
  const match = files.nginx.match(headerPattern);
  if (!match) {
    findings.push(`nginx should send ${headerName} with the always flag.`);
    return;
  }

  if (match[1] !== expectedValue) {
    findings.push(`nginx ${headerName} should equal ${JSON.stringify(expectedValue)}.`);
  }
}

function parsePagesHeaders(source) {
  const routes = new Map();
  let currentRoute = "";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    if (!/^\s/.test(line)) {
      currentRoute = trimmed;
      routes.set(currentRoute, new Map());
      continue;
    }

    if (!currentRoute) {
      findings.push(`Cloudflare Pages _headers has a header outside a route block: ${trimmed}`);
      continue;
    }

    const headerMatch = line.match(/^\s{2,}([^:]+):\s*(.+)$/);
    if (!headerMatch) {
      findings.push(`Cloudflare Pages _headers has an invalid header line: ${rawLine}`);
      continue;
    }

    routes.get(currentRoute).set(headerMatch[1], headerMatch[2]);
  }

  return routes;
}

function requirePagesRoute(route) {
  if (!pagesHeaderRoutes.has(route)) {
    findings.push(`Cloudflare Pages _headers should define route ${route}.`);
  }
}

function requirePagesRouteHeader(route, headerName, expectedValue) {
  const headers = pagesHeaderRoutes.get(route);
  const actualValue = headers?.get(headerName);

  if (actualValue === undefined) {
    findings.push(`Cloudflare Pages _headers route ${route} should send ${headerName}.`);
    return;
  }

  if (actualValue !== expectedValue) {
    findings.push(`Cloudflare Pages _headers route ${route} ${headerName} should equal ${JSON.stringify(expectedValue)}.`);
  }
}

function requireExactPagesRedirects() {
  const lines = files.pagesRedirects
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length !== 1 || lines[0] !== exactPagesRedirects) {
    findings.push(`Cloudflare Pages _redirects should contain only ${JSON.stringify(exactPagesRedirects)}.`);
  }
}

function requireMissingPath(filePath) {
  if (existsSync(join(repoRoot, filePath))) {
    findings.push(`${filePath} should not exist in the static-only runtime.`);
  }
}

function requireBuiltCopy(filePath, expectedSource) {
  const fullPath = join(repoRoot, filePath);
  if (!existsSync(fullPath)) {
    findings.push(`${filePath} should exist after pnpm build:frontend so Cloudflare Pages receives the static runtime file.`);
    return;
  }

  const actual = readFileSync(fullPath, "utf8");
  if (normalizeNewlines(actual) !== normalizeNewlines(expectedSource)) {
    findings.push(`${filePath} should match its frontend/public source file exactly.`);
  }
}

function normalizeNewlines(source) {
  return source.replace(/\r\n/g, "\n");
}

function requireDockerignore(ignoredPath) {
  const entries = new Set(files.dockerignore.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  if (!entries.has(ignoredPath)) {
    findings.push(`.dockerignore should include ${ignoredPath}.`);
  }
}

function forbidDockerignore(requiredInput) {
  const entries = new Set(files.dockerignore.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  if (entries.has(requiredInput) || entries.has(`/${requiredInput}`)) {
    findings.push(`.dockerignore should not ignore required build input ${requiredInput}.`);
  }
}

function requirePackageScript(scriptName, expectedValue) {
  const actualValue = files.packageJson.scripts?.[scriptName];
  if (actualValue !== expectedValue) {
    findings.push(`package.json script ${scriptName} should be ${JSON.stringify(expectedValue)}.`);
  }
}

function requirePackageValue(fieldName, expectedValue) {
  const actualValue = files.packageJson[fieldName];
  if (actualValue !== expectedValue) {
    findings.push(`package.json ${fieldName} should be ${JSON.stringify(expectedValue)}.`);
  }
}
