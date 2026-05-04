/**
 * Plan limits for each tier.
 * -1 means unlimited.
 */
export const PLAN_LIMITS = {
  trial: {
    contacts: 50,
    deals: 50,
    tasks: 100,
    users: 3,
    chatbots: 0,
  },
  starter: {
    contacts: 500,
    deals: 500,
    tasks: 2000,
    users: 5,
    chatbots: 1,
  },
  pro: {
    contacts: 5000,
    deals: 5000,
    tasks: 20000,
    users: 20,
    chatbots: 3,
  },
  enterprise: {
    contacts: -1,
    deals: -1,
    tasks: -1,
    users: -1,
    chatbots: -1,
  },
}

/**
 * Returns the effective limit for an entity given an org's plan and optional
 * per-org planLimits override (stored as JSON in Organization.planLimits).
 */
export function getLimit(plan, entity, planLimitsJson) {
  const base = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial
  const baseLimit = base[entity] ?? 0

  if (planLimitsJson) {
    try {
      const overrides = JSON.parse(planLimitsJson)
      if (typeof overrides[entity] === 'number') return overrides[entity]
    } catch {
      // malformed JSON — fall back to plan default
    }
  }

  return baseLimit
}

/**
 * Checks whether an org can create one more of the given entity type.
 *
 * Returns:
 *   { allowed: true }
 *   { allowed: false, limit: number, current: number, plan: string }
 */
export async function checkPlanLimit(prisma, organizationId, entity) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, planStatus: true, planLimits: true, suspendedAt: true },
  })

  if (!org) return { allowed: false, limit: 0, current: 0, plan: 'unknown' }

  // Suspended orgs can't create anything
  if (org.suspendedAt) {
    return { allowed: false, reason: 'suspended', limit: 0, current: 0, plan: org.plan }
  }

  const limit = getLimit(org.plan, entity, org.planLimits)

  // -1 = unlimited
  if (limit === -1) return { allowed: true }

  // Count current records
  const countMap = {
    contacts: () => prisma.contact.count({ where: { organizationId } }),
    deals: () => prisma.deal.count({ where: { organizationId } }),
    tasks: () => prisma.task.count({ where: { organizationId } }),
    users: () => prisma.user.count({ where: { organizationId } }),
  }

  const counter = countMap[entity]
  if (!counter) return { allowed: true } // unknown entity — don't block

  const current = await counter()

  return {
    allowed: current < limit,
    limit,
    current,
    plan: org.plan,
  }
}

/**
 * Convenience response helper for API routes.
 * Returns a 403 JSON response when the plan limit is reached.
 */
export function planLimitResponse(res, result) {
  return res.status(403).json({
    error: 'Límite del plan alcanzado',
    detail: `Tu plan ${result.plan} permite hasta ${result.limit} ${result.entity ?? 'registros'}. Actualmente tienes ${result.current}.`,
    plan: result.plan,
    limit: result.limit,
    current: result.current,
    upgradeRequired: true,
  })
}
