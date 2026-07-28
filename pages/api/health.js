/**
 * GET /api/health
 *
 * Returns service health status. No auth required.
 * Used by Docker health checks and monitoring.
 */
import prisma from '../../lib/prisma'
import { initScheduler } from '../../lib/scheduler'

// Initialise the cron scheduler once per server process.
// Health is polled on startup so this is a reliable init point.
initScheduler()

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  let dbStatus = 'ok'
  let dbError = null

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    dbStatus = 'error'
    dbError = err.message
  }

  const status = dbStatus === 'ok' ? 'ok' : 'error'
  const httpStatus = status === 'ok' ? 200 : 503

  return res.status(httpStatus).json({
    status,
    db: dbStatus,
    ...(dbError && { error: dbError }),
    timestamp: new Date().toISOString(),
  })
}
