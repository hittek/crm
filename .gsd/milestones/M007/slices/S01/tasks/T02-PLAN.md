---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T02: Write Dockerfile (multi-stage, linux/arm64)

Write a multi-stage Dockerfile: (1) deps stage: install node_modules with pnpm, (2) builder stage: run next build, (3) runner stage: copy .next/standalone + static assets, run as non-root user. Use node:20-alpine as base (multi-arch, includes ARM64). Remove any Neon/Vercel adapter — switch prisma.js to standard DATABASE_URL. Add an entrypoint script that runs `prisma migrate deploy` before starting the app.

## Inputs

- `package.json`
- `lib/prisma.js`
- `prisma/schema.prisma`

## Expected Output

- `Dockerfile`
- `lib/prisma.js (updated datasource)`

## Verification

docker build --platform linux/arm64 -t hittek-crm:test . exits 0
