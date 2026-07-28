import prisma from '../../../lib/prisma'
import { getSession, hashPassword } from '../../../lib/auth'
import { provisionOrg, ensureOrgProvisioned } from '../../../lib/chatwoot'

/**
 * Derives a URL-safe slug from an org name.
 * "Acme MX" → "acmemx", "Mi Empresa S.A." → "miempresasa"
 */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, '')       // only alphanumeric
    .slice(0, 30)                     // max 30 chars
}

/**
 * Ensures the slug is unique by appending a numeric suffix if needed.
 */
async function uniqueSlug(base) {
  let slug = base || 'org'
  let attempt = 0

  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}${attempt}`
    const existing = await prisma.organization.findUnique({ where: { slug: candidate } })
    if (!existing) return candidate
    attempt++
    if (attempt > 99) throw new Error('Unable to generate a unique slug')
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const { orgName, email, password, plan = 'trial', privacyConsent } = req.body

  // ── Validation ────────────────────────────────────────────────────────────
  if (!orgName?.trim()) {
    return res.status(400).json({ error: 'El nombre de la organización es requerido' })
  }
  if (!email?.trim()) {
    return res.status(400).json({ error: 'El correo electrónico es requerido' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }
  if (!privacyConsent) {
    return res.status(400).json({ error: 'Debes aceptar el aviso de privacidad para continuar' })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const allowedPlans = ['trial', 'starter', 'pro']
  if (!allowedPlans.includes(plan)) {
    return res.status(400).json({ error: 'Plan no válido' })
  }

  try {
    // ── Check email not already in use globally ───────────────────────────
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    })
    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo electrónico' })
    }

    // ── Derive unique slug ────────────────────────────────────────────────
    const baseSlug = slugify(orgName.trim())
    const slug = await uniqueSlug(baseSlug)

    // ── Trial dates ────────────────────────────────────────────────────────
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // ── Create org + admin user in a transaction ──────────────────────────
    const { org, user } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName.trim(),
          slug,
          primaryColor: '#4F46E5',
          currency: 'MXN',
          timezone: 'America/Mexico_City',
          locale: 'es-MX',
          isActive: true,
          plan,
          planStatus: 'trialing',
          trialEndsAt,
        },
      })

      const hashedPassword = await hashPassword(password)

      // Capture consent timestamp and IP for LFPDPPP auditability
      const privacyConsentAt = new Date()
      const consentIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: orgName.trim(), // default display name = org name; user can update in profile
          role: 'admin',
          isActive: true,
          organizationId: org.id,
          privacyConsentAt,
          consentIp,
        },
      })

      return { org, user }
    })

    // ── Provision Chatwoot account + AgentBot (non-blocking) ─────────────
    try {
      await ensureOrgProvisioned({ id: org.id, name: org.name, slug: org.slug, chatwootAccountId: null }, prisma)
    } catch (chatwootErr) {
      // Log but do not block signup — can be backfilled later
      console.error(`[signup] Chatwoot provisioning failed for org ${org.id}:`, chatwootErr.message)
    }

    // ── Create session ────────────────────────────────────────────────────
    const session = await getSession(req, res)
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      timezone: user.timezone ?? 'America/Mexico_City',
      locale: user.locale ?? 'es-MX',
      organizationId: org.id,
      organizationName: org.name,
    }
    await session.save()

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: org.id,
        organizationName: org.name,
      },
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        trialEndsAt: org.trialEndsAt,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ error: 'Error al crear la cuenta. Intenta de nuevo.' })
  }
}
