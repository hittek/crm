/**
 * lib/reports/builder.js
 *
 * Calls Claude to turn a plain-language prompt into a validated
 * ReportDefinition JSON.
 *
 * Usage:
 *   const { definition, name, description, tokensUsed } =
 *     await buildReportFromPrompt({ prompt, orgId, orgName })
 */

import Anthropic from '@anthropic-ai/sdk'
import { ReportDefinitionSchema, DEFINITION_JSON_SCHEMA, ENTITY_FIELD_CATALOGUE } from './schema.js'

const client = new Anthropic()

// ─── Custom error ────────────────────────────────────────────────────────────

export class BuilderValidationError extends Error {
  /** @param {string} message @param {string} rawText */
  constructor(message, rawText) {
    super(message)
    this.name = 'BuilderValidationError'
    this.rawText = rawText
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt() {
  return `You are a CRM report builder. The user will describe a report in natural language.
You must respond with ONLY a JSON object that follows the schema below — no explanation, no markdown fences.

## JSON Schema
${DEFINITION_JSON_SCHEMA}

## Available entities and their filterable/groupable fields
${ENTITY_FIELD_CATALOGUE}

## Time template values (use in filter values)
- {{startOf:day}}      — start of today
- {{startOf:week}}     — start of current week (Sunday)
- {{startOf:month}}    — start of current month
- {{startOf:lastMonth}}— start of last month
- {{startOf:year}}     — start of current year
- {{now}}              — current timestamp

## Stage values for deals
open, contacted, proposal, negotiation, won, lost

## Task status values
pending, in_progress, completed, cancelled

## Conversation status values
open, closed, pending

## Rules
1. Always include a "type" field set to "custom".
2. Widget ids must be unique strings like "w1", "w2", ...
3. Use "count" aggregate when no numeric field is needed.
4. Use "sum" with field:"value" for deal revenue totals.
5. Choose bar_chart for grouped/stage data, line_chart for time-series, pie_chart for distribution, number_card for single KPIs, table for row detail, progress_bar for goal vs actual.
6. Keep widget count between 1 and 8. Prefer 3–6 widgets for a good overview.
7. For the "name" and "description" top-level fields, include them even though they are not in the widget schema — the caller will extract them from a wrapper.

## Output format
Return exactly this structure:
{
  "name": "<short report name in the same language as the prompt>",
  "description": "<one sentence describing the report>",
  "definition": {
    "type": "custom",
    "widgets": [ ... ]
  }
}`
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {{ prompt: string, orgId: number, orgName?: string }} params
 * @returns {Promise<{
 *   definition: import('./schema.js').ReportDefinitionSchema,
 *   name: string,
 *   description: string,
 *   rawText: string,
 *   tokensUsed: number,
 * }>}
 * @throws {BuilderValidationError} if Claude response is not valid JSON or fails Zod
 */
export async function buildReportFromPrompt({ prompt, orgId, orgName = '' }) {
  const t0 = Date.now()

  const contextHint = orgName ? `\n\nOrg context: ${orgName} (id: ${orgId})` : ''

  let message
  try {
    message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system:     buildSystemPrompt(),
      messages: [
        { role: 'user', content: `Build a report: ${prompt}${contextHint}` },
      ],
    })
  } catch (err) {
    throw new Error(`Claude API error: ${err.message}`)
  }

  const rawText    = message.content?.[0]?.text ?? ''
  const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0)
  const durationMs = Date.now() - t0

  console.log(`[report-builder] tokens=${tokensUsed} duration=${durationMs}ms orgId=${orgId}`)

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let parsed
  try {
    // Strip markdown fences if Claude added them anyway
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new BuilderValidationError(
      `Claude returned non-JSON: ${rawText.slice(0, 200)}`,
      rawText,
    )
  }

  // ── Extract wrapper fields ────────────────────────────────────────────────
  const name        = parsed.name        || 'Reporte personalizado'
  const description = parsed.description || ''
  const defRaw      = parsed.definition  || parsed  // handle both wrapper and bare formats

  // ── Zod validation ────────────────────────────────────────────────────────
  const result = ReportDefinitionSchema.safeParse(defRaw)
  if (!result.success) {
    const msg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    console.warn(`[report-builder] Zod validation failed: ${msg}`)
    throw new BuilderValidationError(`Invalid report definition: ${msg}`, rawText)
  }

  return {
    definition: result.data,
    name,
    description,
    rawText,
    tokensUsed,
  }
}
