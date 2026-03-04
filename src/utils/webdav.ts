export interface WebDAVFile {
	path: string
	filename: string
	isDirectory: boolean
	size?: number
	lastmod?: string
}

export interface WebDAVEnv {
	WEBDAV_USERNAME?: string
	WEBDAV_PASSWORD?: string
}

function getCredentials(env?: WebDAVEnv): {
	username?: string
	password?: string
} {
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
	const encoded =
		typeof Buffer !== 'undefined'
			? Buffer.from(credentials).toString('base64')
			: btoa(credentials)
	return `Basic ${encoded}`
}

function normalizePath(path: string): string {
	if (!path || path === '/') return '/'
	const cleaned = path
		.replace(/^\/+/, '')
		.replace(/\/+$/, '')
		.replace(/\/+/g, '/')
	if (cleaned.includes('..') || cleaned.includes('\\'))
		throw new Error('Invalid WebDAV path')
	return `/${cleaned}`
}

function buildUrl(baseUrl: string, path: string): string {
	if (
		!baseUrl.startsWith('https://') &&
		!baseUrl.startsWith('http://localhost') &&
		!baseUrl.startsWith('http://127.')
	) {
		throw new Error('WEBDAV_URL must use HTTPS')
	}
	return baseUrl.replace(/\/+$/, '') + normalizePath(path)
}

async function webdavFetch(
	url: string,
	opts: RequestInit,
	env?: WebDAVEnv,
): Promise<Response> {
	const headers = new Headers(opts.headers || {})
	const { username, password } = getCredentials(env)
	if (username && password) {
		headers.set('Authorization', buildAuthHeader(username, password))
	}
	const res = await fetch(url, { ...opts, headers })
	if (res.status === 401) throw new Error('WebDAV: Unauthorized')
	return res
}

function parseMultiStatus(xml: string, basePath: string): WebDAVFile[] {
	const responseBlocks =
		xml.match(/<(?:[^:>\s]+:)?response[\s\S]*?<\/(?:[^:>\s]+:)?response>/gi) ??
		[]
	const results: WebDAVFile[] = []

	for (const block of responseBlocks) {
		const hrefMatch = block.match(
			/<(?:[^:>\s]+:)?href[^>]*>([\s\S]*?)<\/(?:[^:>\s]+:)?href>/i,
		)
		if (!hrefMatch) continue

		let href = hrefMatch[1].trim()
		href = href.replace(/^https?:\/\/[^/]+/, '')
		try {
			href = decodeURIComponent(href)
		} catch {
			// keep as-is if decoding fails
		}
		const itemPath = href.replace(/\/+$/, '') || '/'

		if (itemPath === basePath) continue

		const clMatch = block.match(
			/<(?:[^:>\s]+:)?getcontentlength[^>]*>([\s\S]*?)<\/(?:[^:>\s]+:)?getcontentlength>/i,
		)
		const lmMatch = block.match(
			/<(?:[^:>\s]+:)?getlastmodified[^>]*>([\s\S]*?)<\/(?:[^:>\s]+:)?getlastmodified>/i,
		)
		const isDir = /<(?:[^:>\s]+:)?collection[\s/>]/i.test(block)
		const filename = itemPath.split('/').filter(Boolean).pop() || ''

		results.push({
			path: itemPath,
			filename,
			isDirectory: isDir,
			size: clMatch ? Number(clMatch[1].trim()) : undefined,
			lastmod: lmMatch ? lmMatch[1].trim() : undefined,
		})
	}

	return results
}

export async function listWebDAVDirectory(
	baseUrl: string,
	path: string,
	env?: WebDAVEnv,
): Promise<WebDAVFile[]> {
	try {
		const url = buildUrl(baseUrl, path)
		const body =
			'<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:getlastmodified/><d:resourcetype/></d:prop></d:propfind>'

		const res = await webdavFetch(
			url,
			{
				method: 'PROPFIND',
				headers: { Depth: '1', 'Content-Type': 'application/xml' },
				body,
			},
			env,
		)

		if (res.status === 404) return []
		if (res.status !== 207) return []

		const text = await res.text()
		return parseMultiStatus(text, normalizePath(path))
	} catch {
		return []
	}
}

export async function getWebDAVFile(
	baseUrl: string,
	path: string,
	env?: WebDAVEnv,
): Promise<string | null> {
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

export async function getWebDAVFileBuffer(
	baseUrl: string,
	path: string,
	env?: WebDAVEnv,
): Promise<ArrayBuffer | null> {
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

export async function fileExists(
	baseUrl: string,
	path: string,
	env?: WebDAVEnv,
): Promise<boolean> {
	try {
		const url = buildUrl(baseUrl, path)
		const res = await webdavFetch(url, { method: 'HEAD' }, env)
		return res.ok
	} catch {
		return false
	}
}
