# Stage 1: Build the frontend static assets
FROM node:24-bookworm AS frontend-builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable && pnpm install --frozen-lockfile

COPY DESIGN.md ./DESIGN.md
COPY scripts ./scripts
COPY frontend ./frontend

RUN pnpm design:generate && pnpm build:frontend

# Stage 2: Serve the client-only app
FROM nginx:1.27-alpine AS runtime

COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
