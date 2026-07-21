import prisma from '../../../lib/prisma'
import { requireSuperAdmin } from '../../../lib/superAdmin'
import { ensureOrgProvisioned } from '../../../lib/chatwoot'

export default async function handler(req, res) {
  const admin = await requireSuperAdmin(req, res)
  if (!admin) return // requireSuperAdmin already sent the error response

  if (req.method === 'GET') {
    return listOrgs(res)
  }

  if (req.method === 'POST') {
    return createOrg(req, res)
  }

  if (req.method === 'PATCH') {
    return updateOrg(req, res)
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH'])
  return res.status(405).end()
}

async function createOrg(req, res) {
  const { name, plan = 'trial', adminEmail, adminPassword, adminName } = req.body

  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

  // Derive slug
  const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 30) || 'org'
  let slug = base, attempt = 0
  while (true) {
    const candidate = attempt === 0 ? slug : `${base}${attempt}`
    const existing = await prisma.organization.findUnique({ where: { slug: candidate } })
    if (!existing) { slug = candidate; break }
    if (++attempt > 99) return res.status(500).json({ error: 'No se pudo generar un slug único' })
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const org = await prisma.organization.create({
    data: { name: name.trim(), slug, plan, planStatus: 'trialing', trialEndsAt, isActive: true },
  })

  // Provision Chatwoot — non-blocking
  try {
    await ensureOrgProvisioned({ id: org.id, name: org.name, slug: org.slug, chatwootAccountId: null }, prisma)
  } catch (err) {
    console.error(`[admin/orgs] Chatwoot provisioning failed for org ${org.id}:`, err.message)
  }

  return res.status(201).json({ org })
}

async function listOrgs(res) {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      planStatus: true,
      trialEndsAt: true,
      customDomain: true,
      suspendedAt: true,
      suspendedReason: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      createdAt: true,
      _count: { select: { users: true, contacts: true } },
    },
  })

  return res.status(200).json({ orgs })
}

async function updateOrg(req, res) {
  const { id, action, plan, reason } = req.body

  if (!id) return res.status(400).json({ error: 'Se requiere el ID de la organización' })

  const org = await prisma.organization.findUnique({ where: { id: parseInt(id, 10) } })
  if (!org) return res.status(404).json({ error: 'Organización no encontrada' })

  let data = {}

  switch (action) {
    case 'suspend':
      data = {
        suspendedAt: new Date(),
        suspendedReason: reason || 'Suspendida por el administrador',
        planStatus: 'suspended',
      }
      break

    case 'unsuspend':
      data = {
        suspendedAt: null,
        suspendedReason: null,
        planStatus: org.stripeSubscriptionId ? 'active' : 'trialing',
      }
      break

    case 'override_plan':
      if (!['trial', 'starter', 'pro', 'enterprise'].includes(plan)) {
        return res.status(400).json({ error: 'Plan no válido' })
      }
      data = { plan, planStatus: 'active' }
      break

    default:
      return res.status(400).json({ error: `Acción desconocida: ${action}` })
  }

  const updated = await prisma.organization.update({
    where: { id: parseInt(id, 10) },
    data,
    select: { id: true, name: true, plan: true, planStatus: true, suspendedAt: true },
  })

  return res.status(200).json({ org: updated })
}
