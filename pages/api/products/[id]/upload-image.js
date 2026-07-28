/**
 * POST /api/products/[id]/upload-image
 * Uploads a product image and saves the URL.
 * Body: raw image bytes, Content-Type header set.
 * Query param: ?filename=my-product
 */
import { uploadFile } from '../../../../lib/storage'
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
    where:  { id: productId, organizationId: organizationId },
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

  const { url } = await uploadFile(pathname, buffer, { contentType, addRandomSuffix: false })

  await prisma.product.update({
    where: { id: productId },
    data:  { imageUrl: url },
  })

  return res.json({ url })
}
