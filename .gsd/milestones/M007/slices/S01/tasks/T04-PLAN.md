---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T04: Add /api/health endpoint

Create pages/api/health.js. Returns {status: 'ok', db: 'ok', timestamp: ISO} on success. Checks DB by running prisma.$queryRaw`SELECT 1`. Returns {status: 'error', db: 'error', error: message} with HTTP 503 on DB failure. No auth required.

## Inputs

- `lib/prisma.js`

## Expected Output

- `pages/api/health.js`

## Verification

curl localhost:3000/api/health returns {status:'ok'}
