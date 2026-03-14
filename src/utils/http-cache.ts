import type { Context } from 'hono'

export function setCacheHeaders(
  c: Context,
  etag: string,
  lastModified: string | null,
  options: {
    maxAge?: number
    sMaxAge?: number
    staleWhileRevalidate?: number
    public?: boolean
  } = {}
): void {
  const {
    maxAge = 0,
    sMaxAge = 3600,              // 1 hour fresh at CDN
    staleWhileRevalidate = 604800, // 7 days stale while revalidating
    public: isPublic = true,
  } = options

  const cacheControl = [
    isPublic ? 'public' : 'private',
    `max-age=${maxAge}`,
    `s-maxage=${sMaxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
  ].join(', ')

  c.header('Cache-Control', cacheControl)
  c.header('ETag', etag)
  if (lastModified) c.header('Last-Modified', lastModified)
  c.header('Vary', 'If-None-Match')
}

export function checkNotModified(c: Context, etag: string): boolean {
  const ifNoneMatch = c.req.header('If-None-Match')
  return ifNoneMatch === etag
}

export function formatLastModified(dateString: string | undefined): string | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.toUTCString()
  } catch {
    return null
  }
}