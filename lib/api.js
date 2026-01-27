// API response helpers
export const success = (res, data, status = 200) => res.status(status).json(data)
export const created = (res, data) => res.status(201).json(data)
export const noContent = (res) => res.status(204).end()
export const badRequest = (res, message = 'Bad Request') => res.status(400).json({ error: message })
export const notFound = (res, message = 'Not Found') => res.status(404).json({ error: message })
export const serverError = (res, error) => {
  console.error(error)
  return res.status(500).json({ error: 'Internal Server Error' })
}

export function createHandler(methods) {
  return async function handler(req, res) {
    const method = methods[req.method]
    if (method) {
      try {
        await method(req, res)
      } catch (error) {
        serverError(res, error)
      }
    } else {
      res.setHeader('Allow', Object.keys(methods))
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  }
}

// Parse query params for filtering
export function parseFilters(query) {
  const filters = {}
  const { search, status, stage, priority, tags, contactId, dealId, from, to, sortBy, sortOrder, page, limit } = query

  if (search) filters.search = search
  if (status) filters.status = status
  if (stage) filters.stage = stage
  if (priority) filters.priority = priority
  if (tags) filters.tags = tags
  if (contactId) filters.contactId = parseInt(contactId)
  if (dealId) filters.dealId = parseInt(dealId)
  if (from) filters.from = new Date(from)
  if (to) filters.to = new Date(to)

  return {
    filters,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 50, 100),
  }
}
