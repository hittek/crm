/**
 * pages/api/reports/build.js
 *
 * POST /api/reports/build
 *
 * Body: {
 *   prompt:  string  — plain-language description of the report (required)
 *   name?:   string  — override name (otherwise Claude picks one)
 *   save?:   boolean — if true, persist to ReportDefinition table
 * }
 *
 * 200: { id?, name, description, definition, tokensUsed }
 * 400: missing prompt
 * 401: not authenticated
 * 422: Claude returned invalid JSON or failed Zod validation
 * 500: Anthropic API error or unexpected failure
 */

import { getSession } from '../../../lib/auth'
import prisma          from '../../../lib/prisma'
import { buildReportFromPrompt, BuilderValidationError } from '../../../lib/reports/builder'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' })

  const { organizationId, id: userId } = session.user
  const { prompt, name: nameOverride, save = false } = req.body || {}

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  // Fetch org name for context hint
  const org = await prisma.organization.findUnique({
    where:  { id: organizationId },
    select: { id: true, name: true },
  })
  if (!org) return res.status(404).json({ error: 'Organization not found' })

  try {
    const { definition, name, description, rawText, tokensUsed } =
      await buildReportFromPrompt({ prompt: prompt.trim(), orgId: org.id, orgName: org.name })

    const finalName = nameOverride?.trim() || name

    let savedId = undefined
    if (save) {
      const row = await prisma.reportDefinition.create({
        data: {
          organizationId: org.id,
          name:           finalName,
          description,
          prompt:         prompt.trim(),
          definition:     JSON.stringify(definition),
          isBuiltIn:      false,
          createdBy:      userId,
        },
      })
      savedId = row.id
    }

    return res.json({
      id:          savedId,
      name:        finalName,
      description,
      definition,
      tokensUsed,
    })
  } catch (err) {
    if (err instanceof BuilderValidationError) {
      return res.status(422).json({ error: err.message, rawText: err.rawText })
    }
    console.error('[reports/build]', err)
    return res.status(500).json({ error: err.message })
  }
}
