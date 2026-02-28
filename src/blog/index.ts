import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { withCache } from '../utils/cache.js'
import { logError } from '../utils/helpers.js'
import { db } from '../db.js'

const CONTENT_DIR = process.env.CONTENT_PATH ?? join(process.cwd(), 'content')
const CACHE_TTL = 86400 // 24 hours

async function bustCacheIfStale(key: string, path: string): Promise<void> {
	try {
		const row = db.query<{ expires_at: number }, [string]>(
			'SELECT expires_at FROM cache WHERE key = ?'
		).get(key)
		if (!row) return
		try {
			const { mtimeMs } = await stat(path)
			const cachedAt = row.expires_at - CACHE_TTL
			if (Math.floor(mtimeMs / 1000) > cachedAt) {
				db.query('DELETE FROM cache WHERE key = ?').run(key)
			}
		} catch (statErr) {
			// path was deleted — bust the cache so it doesn't serve stale content
			if ((statErr as NodeJS.ErrnoException).code === 'ENOENT') {
				db.query('DELETE FROM cache WHERE key = ?').run(key)
			}
		}
	} catch {
		// ignore cache read errors
	}
}

async function findIndexFile(slugDir: string): Promise<string | null> {
	for (const ext of ['md', 'mdx']) {
		const filePath = join(slugDir, `index.${ext}`)
		if (await Bun.file(filePath).exists()) return filePath
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
	await bustCacheIfStale('blog:list', CONTENT_DIR)
	return withCache<PostMeta[]>('blog:list', CACHE_TTL, async () => {
		try {
			const entries = await readdir(CONTENT_DIR, { withFileTypes: true })
			const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

			const posts: PostMeta[] = []
			for (const slug of slugs) {
				const filePath = await findIndexFile(join(CONTENT_DIR, slug))
				if (!filePath) continue
				try {
					const raw = await Bun.file(filePath).text()
					const { data: frontmatter } = matter(raw)
					posts.push({ slug, frontmatter })
				} catch (err) {
					logError(`Failed to parse frontmatter for slug "${slug}"`, err)
				}
			}
			return posts
		} catch (err) {
			logError('Failed to read content directory', err)
			return []
		}
	})
}

export async function getBlogPost(slug: string): Promise<Post | null> {
	if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('..')) return null
	const slugDir = join(CONTENT_DIR, slug)
	await bustCacheIfStale(`blog:${slug}`, slugDir)
	return withCache<Post | null>(`blog:${slug}`, CACHE_TTL, async () => {
		const filePath = await findIndexFile(slugDir)
		if (!filePath) return null
		try {
			const raw = await Bun.file(filePath).text()
			const { data: frontmatter, content } = matter(raw)
			return { slug, frontmatter, content }
		} catch (err) {
			logError(`Failed to read post "${slug}"`, err)
			return null
		}
	})
}

export async function getBlogAsset(slug: string, filename: string): Promise<BunFile | null> {
	const assetPath = join(CONTENT_DIR, slug, 'assets', filename)
	if (!assetPath.startsWith(CONTENT_DIR + '/')) return null
	const file = Bun.file(assetPath)
	return (await file.exists()) ? file : null
}
