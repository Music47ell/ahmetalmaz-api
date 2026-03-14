export interface WebDAVFile {
  path: string
  filename: string
  isDirectory: boolean
  size?: number
  lastmod?: string | null
}

export interface WebDAVEnv {
  WEBDAV_USERNAME?: string
  WEBDAV_PASSWORD?: string
}

function getCredentials(env?: WebDAVEnv): { username?: string; password?: string } {
  if (env?.WEBDAV_USERNAME && env?.WEBDAV_PASSWORD) {
    return { username: env.WEBDAV_USERNAME, password: env.WEBDAV_PASSWORD }
  }
  if (typeof process !== 'undefined' && process.env) {
    return {
      username: process.env.WEBDAV_USERNAME,
      password: process.env.WEBDAV_PASSWORD,
    }
  }
  return {}
}

function buildAuthHeader(username: string, password: string): string {
  const credentials = `${username}:${password}`
  const encoded = typeof Buffer !== 'undefined'
    ? Buffer.from(credentials).toString('base64')
    : btoa(credentials)
  return `Basic ${encoded}`
}

function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  const cleaned = path.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/')
  if (cleaned.includes('..') || cleaned.includes('\\')) throw new Error('Invalid WebDAV path')
  return `/${cleaned}`
}

function buildUrl(baseUrl: string, path: string): string {
  if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost') && !baseUrl.startsWith('http://127.')) {
    throw new Error('WEBDAV_URL must use HTTPS')
  }
  return baseUrl.replace(/\/+$/, '') + normalizePath(path)
}

async function webdavFetch(url: string, opts: RequestInit, env?: WebDAVEnv, retries = 3): Promise<Response> {
  const headers = new Headers(opts.headers || {})
  const { username, password } = getCredentials(env)
  if (username && password) {
    headers.set('Authorization', buildAuthHeader(username, password))
  }

  let lastError: Error | null = null
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url, { ...opts, headers, signal: controller.signal })
      clearTimeout(timeout)
      if (res.status === 401) throw new Error('WebDAV: Unauthorized')
      return res
    } catch (err) {
      lastError = err as Error
      if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)))
    }
  }
  throw lastError || new Error('WebDAV: Max retries exceeded')
}

function parseMultiStatus(xml: string, basePath: string): WebDAVFile[] {
  const responseBlocks = xml.match(/<(?:[^:>\s]+:)?response[\s\S]*?<\/(?:[^:>\s]+:)?response>/gi) ?? []
  const results: WebDAVFile[] = []

  for (const block of responseBlocks) {
    const hrefMatch = block.match(/<(?:[^:>\s]+:)?href[^>]*>([\s\S]*?)<\/(?:[^:>\s]+:)?href>/i)
    if (!hrefMatch) continue

    let href = hrefMatch[1].trim()
    href = href.replace(/^https?:\/\/[^/]+/, '')
    try { href = decodeURIComponent(href) } catch {}
    const itemPath = href.replace(/\/+$/, '') || '/'
    if (itemPath === basePath) continue

    const clMatch = block.match(/<(?:[^:>\s]+:)?getcontentlength[^>]*>([\s\S]*?)<\/(?:[^:>\s]+:)?getcontentlength>/i)
    const lmMatch = block.match(/<(?:[^:>\s]+:)?getlastmodified[^>]*>([\s\S]*?)<\/(?:[^:>\s]+:)?getlastmodified>/i)
    const isDir = /<(?:[^:>\s]+:)?collection[\s/>]/i.test(block)
    const filename = itemPath.split('/').filter(Boolean).pop() || ''

    results.push({
      path: itemPath,
      filename,
      isDirectory: isDir,
      size: clMatch ? Number(clMatch[1].trim()) : undefined,
      lastmod: lmMatch ? lmMatch[1].trim() : null,
    })
  }
  return results
}

// ── Apache Auto-Index HTML Parser (Fallback) ───────────────────
export async function listWebDAVDirectoryFallback(
  baseUrl: string,
  path: string,
  env?: WebDAVEnv,
): Promise<WebDAVFile[]> {
  try {
    const url = buildUrl(baseUrl, path)
    const res = await webdavFetch(url, { method: 'GET' }, env)
    if (!res.ok) return []

    const html = await res.text()
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []
    const results: WebDAVFile[] = []

    for (const row of rows) {
      const linkMatch = row.match(/<a\s+href="([^"]+)"/i)
      if (!linkMatch) continue

      let href = linkMatch[1]
      if (href === '../' || href.startsWith('?C=')) continue

      href = decodeURIComponent(href.replace(/\/+$/, ''))
      const filename = href.split('/').pop() || href
      if (!filename || filename === '..') continue

      const dateMatch = row.match(/<td[^>]*>(\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2})<\/td>/i)
      const sizeMatch = row.match(/<td[^>]*>([\d.]+\s*[KMG]?B?|-)<\/td>/i)
      const isDirectory = href.endsWith('/') || row.includes('[DIR]')
      const itemPath = path === '/' ? `/${filename}` : `${path}/${filename}`

      results.push({
        path: itemPath.replace(/\/+/g, '/'),
        filename,
        isDirectory,
        size: sizeMatch ? parseSize(sizeMatch[1]) : undefined,
        lastmod: dateMatch ? parseApacheDate(dateMatch[1]) : null,
      })
    }
    return results
  } catch (err) {
    console.error(`[WebDAV] Fallback listing failed for ${path}:`, err)
    return []
  }
}

function parseApacheDate(dateStr: string): string | null {
  try {
    const [datePart, timePart] = dateStr.split(' ')
    const [day, monthStr, year] = datePart.split('-')
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    const month = months[monthStr]
    if (month === undefined) return null
    const date = new Date(Number(year), month, Number(day))
    date.setHours(Number(timePart.split(':')[0]), Number(timePart.split(':')[1]))
    return date.toISOString()
  } catch {
    return null
  }
}

function parseSize(sizeStr: string): number | undefined {
  const match = sizeStr.match(/([\d.]+)\s*([KMG]?B?)/i)
  if (!match) return undefined
  const value = parseFloat(match[1])
  const unit = match[2]?.toUpperCase().replace('B', '')
  switch (unit) {
    case 'K': return value * 1024
    case 'M': return value * 1024 * 1024
    case 'G': return value * 1024 * 1024 * 1024
    default: return value
  }
}

// ── Main Function: PROPFIND + Fallback ─────────────────────────
export async function listWebDAVDirectory(
  baseUrl: string,
  path: string,
  env?: WebDAVEnv,
): Promise<WebDAVFile[]> {
  // Try PROPFIND first
  try {
    const url = buildUrl(baseUrl, path)
    const body = '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:getlastmodified/><d:resourcetype/></d:prop></d:propfind>'
    const res = await webdavFetch(url, {
      method: 'PROPFIND',
      headers: { Depth: '1', 'Content-Type': 'application/xml' },
      body,
    }, env)

    if (res.status === 207) {
      const text = await res.text()
      return parseMultiStatus(text, normalizePath(path))
    }
  } catch (err) {
    console.log(`[WebDAV] PROPFIND failed, trying fallback:`, (err as Error).message)
  }

  // Fallback to HTML parsing
  return listWebDAVDirectoryFallback(baseUrl, path, env)
}

export async function getWebDAVFile(baseUrl: string, path: string, env?: WebDAVEnv): Promise<string | null> {
  try {
    const url = buildUrl(baseUrl, path)
    const res = await webdavFetch(url, { method: 'GET' }, env)
    if (res.status === 404) return null
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function getWebDAVFileBuffer(baseUrl: string, path: string, env?: WebDAVEnv): Promise<ArrayBuffer | null> {
  try {
    const url = buildUrl(baseUrl, path)
    const res = await webdavFetch(url, { method: 'GET' }, env)
    if (res.status === 404) return null
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

export async function fileExists(baseUrl: string, path: string, env?: WebDAVEnv): Promise<boolean> {
  try {
    const url = buildUrl(baseUrl, path)
    const res = await webdavFetch(url, { method: 'HEAD' }, env)
    return res.ok
  } catch {
    return false
  }
}