---
id: S02
parent: M010-sewkw9
milestone: M010-sewkw9
provides:
  - (none)
requires:
  []
affects:
  []
key_files: []
key_decisions:
  - Used iron-session (not NextAuth) for auth — consistent with all other API routes
  - Model: claude-haiku-4-5-20251001 — same as rest of project
  - System prompt embeds compact JSON Schema + entity field catalogue so Claude has full context without hallucinating field names
  - BuilderValidationError carries rawText so callers can surface debug info to the user
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-28T16:58:43.380Z
blocker_discovered: false
---

# S02: Claude NLP builder

**Claude NLP report builder live: plain-language prompt → validated ReportDefinition JSON, optional DB save**

## What Happened

Built the full Claude NLP builder: Zod schema for validation, builder lib that crafts a structured system prompt and parses Claude output, and a REST endpoint that saves optionally. Claude generates correct, org-scoped ReportDefinition JSON with Spanish widget titles on first call.

## Verification



## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `lib/reports/schema.js` — Zod schemas for widget, query, filter; DEFINITION_JSON_SCHEMA and ENTITY_FIELD_CATALOGUE for prompt
- `lib/reports/builder.js` — buildReportFromPrompt: system prompt with schema+catalogue, Claude call, JSON parse, Zod validation, BuilderValidationError
- `pages/api/reports/build.js` — POST /api/reports/build: iron-session auth, validate input, call builder, optional DB save
