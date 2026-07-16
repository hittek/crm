# M007: Infrastructure Migration \u2014 Vercel to RPi4 Docker

**Vision:** Move the entire stack off Vercel onto a self-hosted Raspberry Pi 4 running Docker Compose, exposed via a static ngrok domain (same pattern as homeblinds-facturacion). crm.hittek.mx CNAME updated to point at the static ngrok URL. The app must run identically to production: same data, same webhook URLs, same custom domain. Outcome: zero dependency on Vercel, full control over the deployment, stable base for M008 Chatwoot integration.

## Success Criteria

- App runs on RPi4 at crm.hittek.mx with no Vercel dependency
- All existing data migrated from Neon Postgres — zero loss
- Existing channels receive and respond to messages via static ngrok URL
- Playwright smoke suite passes against crm.hittek.mx
- Single docker-compose.yml brings up the full stack from scratch

## Slices

- [ ] **S01: Dockerize the Next.js App** `risk:medium` `depends:[]`
  > After this: docker compose up → app responds at localhost:3000, /api/auth/me returns 200

- [ ] **S02: PostgreSQL Migration from Neon** `risk:high` `depends:[S01]`
  > After this: Login with existing credentials — contacts, deals, tasks all visible with migrated data

- [ ] **S03: ngrok Static Domain Tunnel** `risk:low` `depends:[S01]`
  > After this: curl https://crm-hittek.ngrok.app/api/health returns 200 after docker compose restart — same URL every time

- [ ] **S04: Custom Domain Migration (crm.hittek.mx)** `risk:low` `depends:[S03]`
  > After this: https://crm.hittek.mx loads the app running on RPi4 — Vercel no longer in the request path

- [ ] **S05: Production Hardening + Smoke Test** `risk:low` `depends:[S02,S04]`
  > After this: Full CRM walkthrough on crm.hittek.mx: login → contact → deal → Telegram chatbot message → agent reply

## Boundary Map

Not provided.
