// pages/api/notifications/vapid-public-key.js
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return res.status(503).json({ error: 'Push not configured' })
  res.setHeader('Cache-Control', 'public, max-age=86400')
  return res.status(200).json({ key })
}
