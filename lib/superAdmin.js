import { getSession } from './auth'
import prisma from './prisma'

/**
 * Returns the session user if they are a super-admin.
 * Super-admins are identified by User.isSuperAdmin = true.
 */
export async function requireSuperAdmin(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) {
    res.status(401).json({ error: 'No autenticado' })
    return null
  }

  // Re-check from DB to prevent stale session tokens
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isSuperAdmin: true },
  })

  if (!user?.isSuperAdmin) {
    res.status(403).json({ error: 'Acceso no autorizado' })
    return null
  }

  return session.user
}
