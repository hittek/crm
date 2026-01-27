import { getSession } from '../../../lib/auth'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const session = await getSession(req, res)
    
    if (session.user) {
      // Log the logout
      await logAudit({
        action: AuditActions.LOGOUT || 'logout',
        entity: AuditEntities.USER,
        entityId: session.user.id,
        entityName: session.user.name,
        userId: session.user.id,
        userName: session.user.name,
        req,
      })
    }
    
    // Destroy session
    session.destroy()
    
    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Error al cerrar sesión' })
  }
}
