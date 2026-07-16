import prisma from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'

// One-shot migration endpoint — superadmin only
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await getSession(req, res)
  if (!session?.user?.isSuperAdmin) return res.status(403).end()

  const { sql } = req.body
  if (!sql) return res.status(400).json({ error: 'sql required' })

  try {
    await prisma.$executeRawUnsafe(sql)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
