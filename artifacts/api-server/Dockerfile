# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# LINE bot API server — multi-stage build for Railway
# -----------------------------------------------------------------------------
# Stage 1: build (pnpm install + esbuild bundle for @workspace/api-server)
# Stage 2: runtime (minimal node:24-slim, only the bundled dist)
# -----------------------------------------------------------------------------

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /repo

# pnpm 10.x (workspace uses pnpm; corepack reads packageManager field).
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Copy manifests first so pnpm can resolve deps with cache hits on rebuilds.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY lib/db/package.json lib/db/
COPY lib/api-zod/package.json lib/api-zod/
COPY artifacts/api-server/package.json artifacts/api-server/

# Install every workspace package (frozen lockfile for reproducibility).
# BuildKit cache mount keeps pnpm store warm across rebuilds.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# Now copy the actual sources for the packages we need to build.
COPY lib/db/ lib/db/
COPY lib/api-zod/ lib/api-zod/
COPY artifacts/api-server/ artifacts/api-server/

# Build only the api-server (esbuild bundles workspace deps inline).
RUN pnpm --filter @workspace/api-server run build

# -----------------------------------------------------------------------------
# Runtime: only the bundled dist + pino-pretty worker (kept in node_modules)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    LOG_LEVEL=info

# Non-root for defense in depth
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/false app

# Copy the bundled server (self-contained; workspace deps are inlined by esbuild).
COPY --from=build --chown=app:nodejs /repo/artifacts/api-server/dist ./dist
# Keep pino-pretty so the pino worker thread can spawn it at runtime.
COPY --from=build --chown=app:nodejs /repo/artifacts/api-server/node_modules ./node_modules
COPY --from=build --chown=app:nodejs /repo/node_modules ./node_modules

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||8080) +'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
