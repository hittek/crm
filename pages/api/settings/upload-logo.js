import { put } from '@vercel/blob'
import { getSession } from '../../../lib/auth'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const orgId = session.user.organizationId
  const filename = req.query.filename || 'logo'

  // Require Vercel Blob token in production; fall back gracefully in dev
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Dev fallback: read raw body and return a data URL
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] || 'image/png'
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`
    return res.status(200).json({ url: dataUrl })
  }

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] || 'image/png'
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    const pathname = `logos/org-${orgId}/${filename}.${ext}`

    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    })

    return res.status(200).json({ url: blob.url })
  } catch (error) {
    console.error('Logo upload error:', error)
    return res.status(500).json({ error: 'Error al subir el logo' })
  }
}
