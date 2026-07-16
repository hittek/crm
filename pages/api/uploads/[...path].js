/**
 * GET /api/uploads/[...path]
 *
 * Serves files from the local uploads volume (/data/uploads).
 * Used in self-hosted Docker when BLOB_READ_WRITE_TOKEN is not set.
 * In Vercel deployments, files are served directly from Vercel Blob CDN.
 */
import fs from 'fs'
import path from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads'

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const parts = req.query.path
  if (!parts || parts.length === 0) return res.status(400).end()

  // Prevent path traversal
  const relative = parts.join('/')
  if (relative.includes('..')) return res.status(400).end()

  const filePath = path.join(UPLOADS_DIR, relative)

  if (!fs.existsSync(filePath)) return res.status(404).end()

  // Basic content-type by extension
  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
  }
  const contentType = types[ext] || 'application/octet-stream'

  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
}
