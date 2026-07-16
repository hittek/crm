/**
 * File storage abstraction.
 *
 * Local mode (default in self-hosted Docker):
 *   Files written to /data/uploads/<pathname>.
 *   Served via GET /api/uploads/[...path].
 *   Set STORAGE=local (or omit — local is the default when BLOB_READ_WRITE_TOKEN is absent).
 *
 * Vercel Blob mode (legacy, Vercel deployment):
 *   Set BLOB_READ_WRITE_TOKEN to use @vercel/blob.
 */

import fs from 'fs'
import path from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function useVercelBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

/**
 * Upload a file buffer.
 * @param {string} pathname  - relative path within the uploads dir, e.g. 'logos/org-1.png'
 * @param {Buffer} buffer    - file contents
 * @param {object} [opts]    - { contentType, access }  (access ignored in local mode)
 * @returns {Promise<{url: string}>}
 */
export async function uploadFile(pathname, buffer, opts = {}) {
  if (useVercelBlob()) {
    const { put } = await import('@vercel/blob')
    return put(pathname, buffer, { access: 'public', ...opts })
  }

  // Local filesystem
  const dest = path.join(UPLOADS_DIR, pathname)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buffer)
  return { url: `${APP_URL}/api/uploads/${pathname}` }
}

/**
 * Delete a file.
 * @param {string} url - the URL returned by uploadFile
 */
export async function deleteFile(url) {
  if (useVercelBlob()) {
    const { del } = await import('@vercel/blob')
    return del(url)
  }

  // Extract pathname from URL
  const marker = '/api/uploads/'
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const pathname = url.slice(idx + marker.length)
  const dest = path.join(UPLOADS_DIR, pathname)
  try { fs.unlinkSync(dest) } catch { /* ignore missing file */ }
}
