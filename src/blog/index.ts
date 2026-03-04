import matter from 'gray-matter'
import { withCache } from '../utils/cache.js'
import { logError } from '../utils/helpers.js'
import {
	fileExists,
	getWebDAVFile,
	getWebDAVFileBuffer,
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
		if (await fileExists(WEBDAV_URL, filePath)) return filePath
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
			const entries = await listWebDAVDirectory(WEBDAV_URL, CONTENT_PATH)
			const slugs = entries.filter((e) => e.isDirectory).map((e) => e.filename)

			const posts: PostMeta[] = []
			for (const slug of slugs) {
				const slugPath = `${CONTENT_PATH}/${slug}`
				const filePath = await findIndexFile(slugPath)
				if (!filePath) continue
				try {
					const raw = await getWebDAVFile(WEBDAV_URL, filePath)
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
	const slugDir = `${CONTENT_PATH}/${slug}`
	return withCache<Post | null>(`blog:${slug}`, CACHE_TTL, async () => {
		const filePath = await findIndexFile(slugDir)
		if (!filePath) return null
		try {
			const raw = await getWebDAVFile(WEBDAV_URL, filePath)
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
): Promise<{ buffer: Uint8Array; contentType: string } | null> {
	const fullPath = `${CONTENT_PATH}/${slug}/assets/${filename}`

	if (
		fullPath.includes('..') ||
		fullPath.includes('\\') ||
		!fullPath.startsWith(CONTENT_PATH)
	) {
		return null
	}

	try {
		const raw = await getWebDAVFileBuffer(WEBDAV_URL, fullPath)
		if (!raw) return null

		const buffer =
			typeof Buffer !== 'undefined'
				? new Uint8Array(Buffer.from(raw))
				: new Uint8Array(raw)

		const ext = filename.split('.').pop()?.toLowerCase() ?? ''
		const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
		return { buffer, contentType }
	} catch {
		return null
	}
}
