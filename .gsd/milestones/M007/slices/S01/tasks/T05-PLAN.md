---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T05: Smoke test full stack locally

Run docker compose up -d on the RPi4. Wait for all services healthy. curl /api/health. Verify login works. Check container logs for errors. Fix any startup issues discovered.

## Inputs

- `docker-compose.yml`
- `Dockerfile`
- `pages/api/health.js`

## Expected Output

- `All services healthy, /api/health returns 200`

## Verification

curl https://localhost:3000/api/health returns {status:'ok', db:'ok'}. docker compose ps shows all services Up.
