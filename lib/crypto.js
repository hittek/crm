/**
 * AES-256-GCM encryption for storing channel credentials (tokens, secrets).
 *
 * Requires ENCRYPTION_KEY env var — 64 hex chars (32 bytes).
 * Generate once: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import crypto from 'crypto'

const ALG     = 'aes-256-gcm'
const IV_LEN  = 12  // 96-bit IV recommended for GCM
const TAG_LEN = 16

function getKey() {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypt a UTF-8 string. Returns a base64 string in the format:
 *   iv(12B) + tag(16B) + ciphertext — all concatenated then base64-encoded.
 */
export function encrypt(plaintext) {
  const key = getKey()
  const iv  = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

/**
 * Decrypt a base64 string produced by encrypt().
 */
export function decrypt(ciphertext) {
  const key  = getKey()
  const buf  = Buffer.from(ciphertext, 'base64')
  const iv   = buf.subarray(0, IV_LEN)
  const tag  = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const data = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data) + decipher.final('utf8')
}

/** Encrypt a JSON-serialisable object. */
export function encryptJSON(obj) {
  return encrypt(JSON.stringify(obj))
}

/** Decrypt back to a parsed object. */
export function decryptJSON(ciphertext) {
  return JSON.parse(decrypt(ciphertext))
}
