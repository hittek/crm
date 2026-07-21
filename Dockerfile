# syntax=docker/dockerfile:1

# ─── Stage 1: deps ─────────────────────────────────────────────────────────────
# Install production + dev deps. --ignore-scripts skips all postinstall hooks;
# we run prisma generate explicitly in the builder stage instead.
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# ─── Stage 2: builder ──────────────────────────────────────────────────────────
# Generate Prisma client (downloads correct linux-musl-arm64 engine binary),
# then build Next.js with standalone output.
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Explicitly generate Prisma client (replaces the ignored postinstall hook)
RUN pnpm exec prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# ─── Stage 3: prisma-cli ───────────────────────────────────────────────────────
# Install Prisma CLI via npm into a flat prefix so we can COPY it into the
# runner without pnpm symlinks. Separate stage keeps runner cache independent
# of Prisma version bumps vs app code changes.
FROM node:22-alpine AS prisma-cli
RUN npm install --prefix /prisma-cli prisma@7.8.0 --save-exact --no-fund --no-audit 2>/dev/null

# ─── Stage 4: runner ───────────────────────────────────────────────────────────
# Minimal runtime image: standalone server bundle + static assets + prisma CLI.
# No pnpm, no source, no devDependencies, no full node_modules.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone bundle (server.js + minimal node_modules from tracing)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Pre-compressed static assets (_next/static, fonts, icons)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static
# Public directory (favicon, images, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public

# Prisma schema + migrations needed by db push / migrate deploy
COPY --from=builder --chown=nextjs:nodejs /app/prisma         ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.js ./prisma.config.js

# Prisma CLI (flat npm install, no symlinks)
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma-cli /prisma-cli

# Writable volume for local file uploads (when not using Vercel Blob)
RUN mkdir -p /data/uploads && chown nextjs:nodejs /data/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
