# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |
|---|------|-------|----------|--------|-----------|------------|---------|
| D001 | M008 validation | quality-process | M008 validation browser gate: Playwright browser tool non-functional on deployment host. Downgraded to needs-attention solely due to automated gate requiring browser_assert output. | Accept needs-attention and proceed to milestone completion override | All M008 success criteria are verified with objective gsd_uat_exec evidence (API responses, DB checks, app logs). The browser gate is a process requirement that cannot be satisfied because Playwright crashes on the RPi4 deployment host. Work is genuinely complete — this is a tooling constraint, not a quality gap. | Yes — re-run browser checks when browser tool is working | human |
| D002 | M011-s2bgo9 planning phase | infrastructure | Local vs cloud embeddings for knowledge base chunks | Keep Voyage AI free tier indefinitely; revisit Ollama migration when server RAM is freed or expanded | Server (i5-7500T, 7.6GB RAM) has only ~1.2GB free and swap is 100% exhausted. nomic-embed-text via Ollama needs ~550MB at inference time — would cause swap thrashing on every embedding call. Voyage AI free tier provides 50M tokens/month which is effectively unlimited for a single-org CRM KB. | Yes — when server RAM drops below 60% sustained usage or hardware is upgraded | human |
