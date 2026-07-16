---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T01: Audit Vercel-specific dependencies and ARM64 blockers

Read package.json, next.config.js, prisma/schema.prisma, and lib/prisma.js to identify: (1) Vercel/Neon-specific packages (@vercel/postgres, @prisma/adapter-neon, etc.), (2) native modules that need ARM64 binaries (bcrypt, sharp, canvas, etc.), (3) any NEXT_PUBLIC_ env vars hardcoded or referencing Vercel URLs, (4) build-time env var requirements. Produce a written audit.

## Inputs

- `package.json`
- `next.config.js`
- `prisma/schema.prisma`
- `lib/prisma.js`

## Expected Output

- `Written audit of blockers in task summary`

## Verification

Audit complete — all blockers listed with resolution plan
