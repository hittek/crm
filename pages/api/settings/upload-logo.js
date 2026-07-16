import { uploadFile } from '../../../lib/storage'
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

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] || 'image/png'
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    const pathname = `logos/org-${orgId}/${filename}.${ext}`

    const { url } = await uploadFile(pathname, buffer, { contentType, addRandomSuffix: false })

    return res.status(200).json({ url })
  } catch (error) {
    console.error('Logo upload error:', error)
    return res.status(500).json({ error: 'Error al subir el logo' })
  }
}
