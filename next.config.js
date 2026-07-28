/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude these Node.js native/large packages from webpack analysis entirely.
      // pdf-parse v2 and formidable are server-only and cause OOM in dev mode
      // when webpack tries to bundle them.
      const existing = config.externals ?? []
      const externalFn = ({ request }, callback) => {
        if (['pdf-parse', 'formidable', 'web-push'].includes(request)) {
          return callback(null, `commonjs ${request}`)
        }
        callback()
      }
      config.externals = [...(Array.isArray(existing) ? existing : [existing]), externalFn]
    } else {
      // These are server-only — exclude from client bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        encoding: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
