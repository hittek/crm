/**
 * lib/deliverers/email.js
 *
 * Sends a report digest email via Resend when a ReportRun completes.
 *
 * Gracefully skips if RESEND_API_KEY is not configured.
 */

import prisma from '../prisma.js'

const FROM_EMAIL = process.env.REPORT_FROM_EMAIL || 'reportes@crm.hittek.mx'
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.hittek.mx'

// ─── Resend free-tier quota guard ─────────────────────────────────────────
// Free plan: 100 emails/day, 3 000 emails/month (global across all orgs).
// We track usage by summing deliveredVia.email.sent across all ReportRun rows
// in the relevant window.  Numbers are approximate but safe — we always leave
// a 10-email buffer before hard limits to absorb concurrent runs.

const DAILY_LIMIT   = 100
const MONTHLY_LIMIT = 3_000
const BUFFER        = 10   // don't send the very last N slots

async function countEmailsSentInWindow(since) {
  const runs = await prisma.reportRun.findMany({
    where:  { deliveredAt: { gte: since } },
    select: { deliveredVia: true },
  })
  let total = 0
  for (const r of runs) {
    if (!r.deliveredVia) continue
    try {
      const dv = JSON.parse(r.deliveredVia)
      total += dv?.email?.sent ?? 0
    } catch { /* corrupt row — ignore */ }
  }
  return total
}

async function getRemainingQuota() {
  const now       = new Date()
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1)

  const [dailyUsed, monthlyUsed] = await Promise.all([
    countEmailsSentInWindow(todayStart),
    countEmailsSentInWindow(monthStart),
  ])

  const dailyLeft   = Math.max(0, DAILY_LIMIT   - dailyUsed   - BUFFER)
  const monthlyLeft = Math.max(0, MONTHLY_LIMIT - monthlyUsed - BUFFER)
  return { dailyLeft, monthlyLeft, dailyUsed, monthlyUsed }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatValue(widget) {
  const val = widget.data?.value ?? 0
  if (widget.format === 'currency') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
  }
  if (widget.format === 'percent') return `${val}%`
  return typeof val === 'number' ? val.toLocaleString('es-MX') : String(val)
}

function buildHtml({ reportName, date, widgets, reportId, orgName }) {
  const numberCards = (widgets || []).filter(w => w.type === 'number_card' && w.data?.value !== undefined)
  const tables      = (widgets || []).filter(w => w.type === 'table')

  const cardRows = numberCards.map(w => `
    <tr>
      <td style="padding:10px 16px;color:#6b7280;font-size:14px;">${w.title}</td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;font-size:20px;color:#111827;">
        ${formatValue(w)}
      </td>
    </tr>`).join('')

  const tableSection = tables.map(t => {
    const rows = t.data?.rows || []
    return `
    <p style="margin:24px 0 8px;font-weight:600;color:#374151;">${t.title}</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">${rows.length} registros</p>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${reportName}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f9fafb;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <!-- Header -->
    <div style="background:#1d4ed8;padding:24px 32px;">
      <p style="margin:0;color:#93c5fd;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${orgName}</p>
      <h1 style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:700;">${reportName}</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">${date}</p>
    </div>

    <!-- Metrics -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tbody>
        ${cardRows || '<tr><td style="padding:16px;color:#6b7280;">Sin métricas de resumen.</td></tr>'}
      </tbody>
    </table>

    ${tableSection}

    <!-- CTA -->
    <div style="padding:24px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <a href="${APP_URL}/reports/${reportId}"
         style="display:inline-block;background:#1d4ed8;color:#fff;font-weight:600;font-size:14px;
                padding:10px 24px;border-radius:6px;text-decoration:none;">
        Ver reporte completo →
      </a>
    </div>
  </div>
</body>
</html>`
}

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * @param {{
 *   run:        { id: number }
 *   definition: { name: string }
 *   widgets:    any[]
 *   org:        { id: number; name: string }
 *   recipients?: Array<{ email: string; name: string }>
 * }} opts
 */
export async function deliverReportEmail({ run, definition, widgets, org, recipients }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — skipping email delivery')
    return { skipped: true, reason: 'no_api_key' }
  }

  // Lazy import so the module is parseable without the key
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  // Default recipients: all admin users in org
  let to = recipients
  if (!to?.length) {
    const admins = await prisma.user.findMany({
      where:  { organizationId: org.id, role: { in: ['admin', 'manager'] } },
      select: { email: true, name: true },
    })
    to = admins
  }

  if (!to.length) {
    console.log(`[email] no recipients for org=${org.id}`)
    return { skipped: true, reason: 'no_recipients' }
  }

  // ── Quota check ───────────────────────────────────────────
  const { dailyLeft, monthlyLeft, dailyUsed, monthlyUsed } = await getRemainingQuota()
  const canSend = Math.min(to.length, dailyLeft, monthlyLeft)

  if (canSend <= 0) {
    const reason = dailyLeft <= 0 ? 'daily_limit_reached' : 'monthly_limit_reached'
    console.warn(`[email] quota exhausted (daily=${dailyUsed}/${DAILY_LIMIT} monthly=${monthlyUsed}/${MONTHLY_LIMIT}) — skipping runId=${run.id}`)
    return { skipped: true, reason, dailyUsed, monthlyUsed }
  }

  if (canSend < to.length) {
    console.warn(
      `[email] quota cap: trimming recipients from ${to.length} to ${canSend}` +
      ` (daily=${dailyUsed}/${DAILY_LIMIT} monthly=${monthlyUsed}/${MONTHLY_LIMIT}) runId=${run.id}`
    )
    to = to.slice(0, canSend)
  } else {
    console.log(`[email] quota ok (daily=${dailyUsed}/${DAILY_LIMIT} monthly=${monthlyUsed}/${MONTHLY_LIMIT}) runId=${run.id}`)
  }

  const date = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const html    = buildHtml({ reportName: definition.name, date, widgets, reportId: run.reportId, orgName: org.name })
  const subject = `📊 ${definition.name} — ${date}`

  let sent = 0
  const errors = []

  await Promise.allSettled(
    to.map(async ({ email, name }) => {
      try {
        await resend.emails.send({
          from:    `${org.name} CRM <${FROM_EMAIL}>`,
          to:      email,
          subject,
          html,
        })
        sent++
        console.log(`[email] sent runId=${run.id} → ${email}`)
      } catch (err) {
        errors.push({ email, error: err.message })
        console.warn(`[email] failed runId=${run.id} → ${email}: ${err.message}`)
      }
    })
  )

  return { sent, errors, skipped: false }
}
