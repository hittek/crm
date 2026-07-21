---
id: M007
title: "Infrastructure Migration — Vercel to RPi4 Docker"
status: complete
completed_at: 2026-07-21T17:55:08.676Z
key_decisions:
  - linux/amd64 platform for x86_64 host
  - ngrok custom domain crm.hittek.mx replaces crm-hittek.ngrok.app as primary URL
  - All NEXT_PUBLIC_* vars updated to crm.hittek.mx
  - Seed run via patched script inside container using internal DB URL
key_files:
  - Dockerfile
  - docker-compose.yaml
  - .env
  - docker-entrypoint.sh
lessons_learned:
  - (none)
---

# M007: Infrastructure Migration — Vercel to RPi4 Docker

**hittek CRM fully migrated from Vercel to RPi4 Docker — https://crm.hittek.mx live, login verified, no Vercel dependency**

## What Happened

Migrated hittek-chatbot CRM from Vercel to self-hosted RPi4 Docker. Built a multi-stage amd64 Dockerfile, wired a full docker-compose stack (app + postgres + redis + ngrok), established a static ngrok tunnel at crm-hittek.ngrok.app, then migrated to custom domain crm.hittek.mx via ngrok domain reservation. Seeded the database, confirmed login and CRM routes via browser and API. All 5 slices complete, milestone validation passed.

## Success Criteria Results

Not provided.

## Definition of Done Results

Not provided.

## Requirement Outcomes

Not provided.

## Deviations

1. docker-compose.yaml had linux/arm64 platform on x86_64 host — fixed to linux/amd64. 2. ngrok custom domain requires deleting CNAME before reservation. 3. docker compose restart doesn't re-read .env — must use `up -d`. 4. Seed script needed patching to remove dotenv inside container. 5. Playwright crashes on heavy Next.js post-login navigation due to server memory — core flow verified via node script instead.

## Follow-ups

1. Verify Telegram webhook still works with crm.hittek.mx URL (update webhook registration). 2. Remove Vercel project/deployment if no longer needed. 3. Set up automated postgres_data volume backups. 4. Add swap or increase server RAM to stabilize headless browser for future E2E tests.
