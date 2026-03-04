import matter from 'gray-matter'
import { withCache } from '../utils/cache.js'
import { logError } from '../utils/helpers.js'
import {
	fileExists,
	getWebDAVClient,
	getWebDAVFile,
	listWebDAVDirectory,
} from '../utils/webdav.js'
import { processMarkdown } from './processor.js'

const WEBDAV_URL = process.env.WEBDAV_URL
const CONTENT_PATH = 'content'
const CACHE_TTL = 86400 // 24 hours
const WORDS_PER_MINUTE = 200

const MIME_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	avif: 'image/avif',
	mp4: 'video/mp4',
	webm: 'video/webm',
	pdf: 'application/pdf',
}

if (!WEBDAV_URL) {
	throw new Error('WEBDAV_URL environment variable is required')
}

function getReadingStats(content: string): {
	wordCount: number
	readingTime: number
} {
	const wordCount = content.trim().split(/\s+/).filter(Boolean).length
	const readingTime = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
	return { wordCount, readingTime }
}

async function findIndexFile(slugDir: string): Promise<string | null> {
	for (const ext of ['md', 'mdx']) {
		const filePath = `${slugDir}/index.${ext}`
		if (await fileExists(filePath)) return filePath
	}
	return null
}

export interface PostMeta {
	slug: string
	frontmatter: Record<string, unknown>
}

export interface Post extends PostMeta {
	content: string
}

export async function getBlogList(): Promise<PostMeta[]> {
	return withCache<PostMeta[]>('blog:list', CACHE_TTL, async () => {
		try {
			const entries = await listWebDAVDirectory(CONTENT_PATH)
			const slugs = entries.filter((e) => e.isDirectory).map((e) => e.filename)

			const posts: PostMeta[] = []
			for (const slug of slugs) {
				const slugPath = CONTENT_PATH ? `${CONTENT_PATH}/${slug}` : slug
				const filePath = await findIndexFile(slugPath)
				if (!filePath) continue
				try {
					const raw = await getWebDAVFile(filePath)
					if (!raw) continue

					const { data: frontmatter, content } = matter(raw)
					if (frontmatter.draft !== false) continue
					posts.push({
						slug,
						frontmatter: { ...frontmatter, ...getReadingStats(content) },
					})
				} catch (err) {
					logError(`Failed to parse frontmatter for slug "${slug}"`, err)
				}
			}
			return posts.sort((a, b) => {
				const da = new Date(a.frontmatter.published as string).getTime()
				const db_ = new Date(b.frontmatter.published as string).getTime()
				return db_ - da
			})
		} catch (err) {
			logError('Failed to read WebDAV content directory', err)
			return []
		}
	})
}

export async function getBlogPost(slug: string): Promise<Post | null> {
	if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('..'))
		return null
	const slugDir = CONTENT_PATH ? `${CONTENT_PATH}/${slug}` : slug
	return withCache<Post | null>(`blog:${slug}`, CACHE_TTL, async () => {
		const filePath = await findIndexFile(slugDir)
		if (!filePath) return null
		try {
			const raw = await getWebDAVFile(filePath)
			if (!raw) return null

			const { data: frontmatter, content } = matter(raw)
			if (frontmatter.draft !== false) return null
			const html = await processMarkdown(content)
			return {
				slug,
				frontmatter: { ...frontmatter, ...getReadingStats(content) },
				content: html,
			}
		} catch (err) {
			logError(`Failed to read post "${slug}"`, err)
			return null
		}
	})
}

export async function getBlogAsset(
	slug: string,
	filename: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
	const assetPath = CONTENT_PATH
		? `${CONTENT_PATH}/${slug}/assets/${filename}`
		: `${slug}/assets/${filename}`
	// Basic path traversal check
	if (
		assetPath.includes('..') ||
		assetPath.includes('\\') ||
		(CONTENT_PATH && !assetPath.startsWith(CONTENT_PATH))
	) {
		return null
	}

	try {
		const client = getWebDAVClient()
		const raw = await client.getFileContents(assetPath)
		const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer)
		const ext = filename.split('.').pop()?.toLowerCase() ?? ''
		const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
		return { buffer, contentType }
	} catch {
		return null
	}
}
