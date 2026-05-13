/**
 * POST /api/products/[id]/upload-image
 * Uploads a product image to Vercel Blob and saves the URL.
 * Requires CRM session auth. Body: raw image bytes, Content-Type header set.
 * Query param: ?filename=my-product
 */
import { put } from '@vercel/blob'
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const productId = parseInt(req.query.id, 10)
  if (isNaN(productId)) return res.status(400).json({ error: 'ID inválido' })

  const product = await prisma.product.findFirst({
    where:  { id: productId, orgId: organizationId },
    select: { id: true },
  })
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer      = Buffer.concat(chunks)
  const contentType = req.headers['content-type'] || 'image/jpeg'
  const ext         = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const filename    = req.query.filename || `product-${productId}`
  const pathname    = `products/org-${organizationId}/${filename}.${ext}`

  let url
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    url = `data:${contentType};base64,${buffer.toString('base64')}`
  } else {
    const blob = await put(pathname, buffer, {
      access: 'public', contentType, addRandomSuffix: false,
    })
    url = blob.url
  }

  await prisma.product.update({
    where: { id: productId },
    data:  { imageUrl: url },
  })

  return res.json({ url })
}
