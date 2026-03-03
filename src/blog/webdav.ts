import { createClient, type FileStat, type WebDAVClient } from 'webdav'
import { logError } from '../utils/helpers.js'

let webdavClient: WebDAVClient | null = null

export function getWebDAVClient(): WebDAVClient {
	if (!webdavClient) {
		const url = process.env.WEBDAV_URL
		if (!url) {
			throw new Error(
				'WEBDAV_URL environment variable not set. Set WEBDAV_URL and optionally WEBDAV_USERNAME/WEBDAV_PASSWORD',
			)
		}

		const username = process.env.WEBDAV_USERNAME
		const password = process.env.WEBDAV_PASSWORD

		// Use Buffer.from() instead of btoa() to correctly handle special characters in passwords
		if (username && password) {
			const encoded = Buffer.from(`${username}:${password}`).toString('base64')
			webdavClient = createClient(url, {
				headers: {
					Authorization: `Basic ${encoded}`,
				},
			})
		} else {
			webdavClient = createClient(url)
		}
	}
	return webdavClient
}

export interface WebDAVFile {
	path: string
	filename: string
	isDirectory: boolean
	size?: number
	lastmod?: string
}

export async function listWebDAVDirectory(path: string): Promise<WebDAVFile[]> {
	try {
		const client = getWebDAVClient()
		const dirPath = path ? `/${path.replace(/^\/|\/$/g, '')}` : '/'
		const contents = (await client.getDirectoryContents(dirPath)) as FileStat[]
		return contents.map((item) => ({
			path: item.filename,
			filename: item.basename || item.filename.split('/').pop() || '',
			isDirectory: item.type === 'directory',
			size: item.size,
			lastmod: item.lastmod,
		}))
	} catch (err) {
		logError(`Failed to list WebDAV directory ${path}`, err)
		return []
	}
}

export async function getWebDAVFile(path: string): Promise<string | null> {
	try {
		const client = getWebDAVClient()
		const content = await client.getFileContents(path)
		return typeof content === 'string' ? content : content.toString()
	} catch (err) {
		logError(`Failed to read WebDAV file ${path}`, err)
		return null
	}
}

export async function fileExists(path: string): Promise<boolean> {
	try {
		const client = getWebDAVClient()
		const stat = await client.stat(path)
		return !!stat
	} catch {
		return false
	}
}
