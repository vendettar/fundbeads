# Fundbeads Deployment Guide

This document describes the CI/CD architecture and operational procedures for deploying Fundbeads to **Cloudflare Pages**.

> **Current phase**: Frontend-only. No backend server is required — all processing runs in the user's browser. The deployment target is Cloudflare Pages.

---

## 1. Architecture Overview

```
GitHub (main / release branch)
        │
        ▼  push / PR merge
GitHub Actions (.github/workflows/deploy-pages.yml)
        │
        │  pnpm build → frontend/dist/
        │
        ▼
Cloudflare Pages  (fundbeads project)
        │
        ├── preview  ← main branch
        └── production  ← release branch
```

- **All logic runs in the browser** — no API server, no database, no secrets needed at runtime.
- **Cloudflare Pages** serves the static Vite build globally via Cloudflare's CDN.
- **Two environments** mirror the git branch model: `main` → preview, `release` → production.

---

## 2. One-time Setup

### 2.1 Cloudflare Pages Project

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the `vendettar/fundbeads` repository.
4. Configure the build settings:

   | Setting | Value |
   | :--- | :--- |
   | Production branch | `release` |
   | Build command | `pnpm --dir frontend build` |
   | Build output directory | `frontend/dist` |
   | Root directory | `/` (repo root) |
   | Node.js version | `22` |

5. Click **Save and Deploy** (the initial deploy may fail — CI will take over).
6. Note the **project name** (e.g., `fundbeads`) — must match `--project-name` in the workflow.

### 2.2 Cloudflare API Token

Create a scoped API token to allow GitHub Actions to deploy:

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens).
2. Click **Create Token → Custom Token**.
3. Permissions:

   | Resource | Permission |
   | :--- | :--- |
   | Account → Cloudflare Pages | Edit |

4. Set **Account Resources** to your account.
5. Click **Continue to Summary → Create Token**. Copy the token.

### 2.3 GitHub Secrets & Environments

Create two GitHub Environments in **Settings → Environments**:
- `pages-preview` (for the `main` branch)
- `pages-production` (for the `release` branch — add protection rules / required reviewers as needed)

Add the following **secrets** to each environment (or at repository level):

| Secret | Description |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | The scoped Pages API token created above |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID (visible in the dashboard right sidebar) |

---

## 3. Branch & Deployment Model

| Git Branch | Environment | Trigger | URL |
| :--- | :--- | :--- | :--- |
| `main` | Preview / Pre-production | Every push or PR merge | `*.fundbeads.pages.dev` |
| `release` | Production | Every push or PR merge | Custom domain (e.g. `fundbeads.app`) |
| Any PR | CI only | PR opened / updated | Build + test — no deploy |

### Branch rules

- Feature development happens on `feature/*` branches.
- All features are merged into `main` via **Squash and Merge** or **Rebase and Merge** (no merge commits).
- Once `main` is validated in preview, open a **PR (`main` → `release`)** to promote to production.
- Merging that PR triggers automatic production deployment.

---

## 4. CI/CD Workflows

### `pr-ci.yml` — Pull Request Validation

- **Trigger**: Any PR targeting `main` or `release`.
- **Steps**: Install → Build (`tsc + vite build`) → Test (`vitest run`).
- **Purpose**: Gates all merges on a green build and full test suite.

### `deploy-pages.yml` — Cloudflare Pages Deployment

- **Trigger**: Push to `main` (preview) or `release` (production), or manual `workflow_dispatch`.
- **Steps**: Install → Build → `wrangler pages deploy`.
- **Branch mapping**: `release` maps to the Cloudflare Pages production deployment; all other branches create preview deployments.

---

## 5. Standard Operating Procedures

### 5.1 Normal Feature Release

1. Create a `feature/my-feature` branch from `main`.
2. Open a **PR → `main`**. CI must pass.
3. Merge via **Squash and Merge**. Preview deploys automatically.
4. Validate at the preview URL.
5. Open a **PR (`main` → `release`)** and merge. Production deploys automatically.

### 5.2 Emergency Hotfix

1. Create a `hotfix/fix-name` branch from `release`.
2. Commit the fix and open a **PR → `release`**.
3. Merge. Production deploys automatically.
4. **Critical**: Cherry-pick the fix back into `main`:
   ```bash
   git checkout main
   git cherry-pick <hotfix-sha>
   git push
   ```

### 5.3 Manual Deploy (workflow_dispatch)

1. Go to **Actions → Deploy to Cloudflare Pages → Run workflow**.
2. Select the branch (`main` for preview, `release` for production).
3. Choose the target environment and click **Run workflow**.

### 5.4 Rollback

Cloudflare Pages keeps a full deployment history — rollback is instant:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages → fundbeads → Deployments**.
2. Find the last known-good deployment.
3. Click **⋯ → Rollback to this deployment**.

Alternatively, revert the offending commit on `release` and let CI redeploy.

---

## 6. Local Development

```bash
# Install dependencies
pnpm install

# Start dev server with hot reload
pnpm dev

# Build production bundle
pnpm build:frontend

# Build + run all tests
pnpm check
```

Dev server runs at `http://localhost:5173` by default.

---

## 7. Future Phases

When a backend is introduced (Cloudflare Worker or VPS-hosted API), this guide will be extended with:

- **Cloudflare Workers / D1** deployment via Wrangler.
- **VPS deployment** using Docker Compose over SSH.
- **Environment variables** for `VITE_API_BASE_URL` and backend secrets.
- **Staging vs. production** API endpoint separation.

GitHub Environments will be updated with additional secrets and the workflow matrix will expand.
