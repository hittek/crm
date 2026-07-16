---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T03: Write docker-compose.yml (app + postgres + redis)

Write docker-compose.yml with three services: (1) app: hittek-crm image, env_file: .env, depends_on postgres + redis, restart: unless-stopped; (2) postgres: postgres:15-alpine, volume for data persistence, POSTGRES_DB/USER/PASSWORD from env; (3) redis: redis:7-alpine, volume for persistence. All on a shared bridge network. Health checks on postgres and redis. App waits for postgres healthy before starting.

## Inputs

- `Dockerfile`

## Expected Output

- `docker-compose.yml`
- `.env.example (updated)`

## Verification

docker compose config validates without errors
