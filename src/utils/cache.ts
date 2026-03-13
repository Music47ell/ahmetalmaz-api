import { createHash } from 'crypto'

import { db } from '../db.js'
import { logError } from './helpers.js'

const BLOG_LIST_CACHE_ID = 1

export interface CachedPost {
	slug: string
	content_hash: string
	rendered_html: string
	frontmatter_json: string
	word_count: number
	reading_time: number
	mastodon_embed_json: string | null
	etag: string
	created_at: number
	updated_at: number
}

export interface BlogListCache {
	posts_index_json: string
	list_etag: string
	last_rebuilt_at: number
	dir_state_checksum: string
}

export interface PostRegistryEntry {
	slug: string
	content_hash: string
	webdav_path: string
	last_checked_at: number
}

export const CacheSystem = {
	// ── Post Cache Operations ─────────────────────────────────────
	async getCachedPost(slug: string): Promise<CachedPost | null> {
		try {
			const result = await db.execute({
				sql: 'SELECT * FROM posts_cache WHERE slug = ?',
				args: [slug],
			})
			const row = result.rows[0]
			if (row) {
				return {
					slug: row.slug as string,
					content_hash: row.content_hash as string,
					rendered_html: row.rendered_html as string,
					frontmatter_json: row.frontmatter_json as string,
					word_count: row.word_count as number,
					reading_time: row.reading_time as number,
					mastodon_embed_json: row.mastodon_embed_json as string | null,
					etag: row.etag as string,
					created_at: row.created_at as number,
					updated_at: row.updated_at as number,
				}
			}
		} catch (err) {
			logError(`CacheSystem.getCachedPost: failed for slug "${slug}"`, err)
		}
		return null
	},

	async upsertCachedPost(post: CachedPost): Promise<void> {
		try {
			await db.execute({
				sql: `
          INSERT INTO posts_cache (
            slug, content_hash, rendered_html, frontmatter_json,
            word_count, reading_time, mastodon_embed_json,
            etag, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            content_hash = excluded.content_hash,
            rendered_html = excluded.rendered_html,
            frontmatter_json = excluded.frontmatter_json,
            word_count = excluded.word_count,
            reading_time = excluded.reading_time,
            mastodon_embed_json = excluded.mastodon_embed_json,
            etag = excluded.etag,
            updated_at = excluded.updated_at
        `,
				args: [
					post.slug,
					post.content_hash,
					post.rendered_html,
					post.frontmatter_json,
					post.word_count,
					post.reading_time,
					post.mastodon_embed_json,
					post.etag,
					post.created_at,
					post.updated_at,
				],
			})
		} catch (err) {
			logError(
				`CacheSystem.upsertCachedPost: failed for slug "${post.slug}"`,
				err,
			)
		}
	},

	async deleteCachedPost(slug: string): Promise<void> {
		try {
			await Promise.all([
				db.execute({
					sql: 'DELETE FROM posts_cache WHERE slug = ?',
					args: [slug],
				}),
				db.execute({
					sql: 'DELETE FROM posts_registry WHERE slug = ?',
					args: [slug],
				}),
			])
		} catch (err) {
			logError(`CacheSystem.deleteCachedPost: failed for slug "${slug}"`, err)
		}
	},

	// ── Blog List Cache Operations ───────────────────────────────
	async getBlogListCache(): Promise<BlogListCache | null> {
		try {
			const result = await db.execute({
				sql: 'SELECT posts_index_json, list_etag, last_rebuilt_at, dir_state_checksum FROM blog_list_cache WHERE id = ?',
				args: [BLOG_LIST_CACHE_ID],
			})
			const row = result.rows[0]
			if (row) {
				return {
					posts_index_json: row.posts_index_json as string,
					list_etag: row.list_etag as string,
					last_rebuilt_at: row.last_rebuilt_at as number,
					dir_state_checksum: row.dir_state_checksum as string,
				}
			}
		} catch (err) {
			logError('CacheSystem.getBlogListCache: failed', err)
		}
		return null
	},

	async upsertBlogListCache(cache: BlogListCache): Promise<void> {
		try {
			await db.execute({
				sql: `
          INSERT INTO blog_list_cache (id, posts_index_json, list_etag, last_rebuilt_at, dir_state_checksum)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            posts_index_json = excluded.posts_index_json,
            list_etag = excluded.list_etag,
            last_rebuilt_at = excluded.last_rebuilt_at,
            dir_state_checksum = excluded.dir_state_checksum
        `,
				args: [
					BLOG_LIST_CACHE_ID,
					cache.posts_index_json,
					cache.list_etag,
					cache.last_rebuilt_at,
					cache.dir_state_checksum,
				],
			})
		} catch (err) {
			logError('CacheSystem.upsertBlogListCache: failed', err)
		}
	},

	// ── Registry Operations ──────────────────────────────────────
	async getRegistryEntry(slug: string): Promise<PostRegistryEntry | null> {
		try {
			const result = await db.execute({
				sql: 'SELECT slug, content_hash, webdav_path, last_checked_at FROM posts_registry WHERE slug = ?',
				args: [slug],
			})
			const row = result.rows[0]
			if (row) {
				return {
					slug: row.slug as string,
					content_hash: row.content_hash as string,
					webdav_path: row.webdav_path as string,
					last_checked_at: row.last_checked_at as number,
				}
			}
		} catch (err) {
			logError(`CacheSystem.getRegistryEntry: failed for slug "${slug}"`, err)
		}
		return null
	},

	async upsertRegistryEntry(entry: PostRegistryEntry): Promise<void> {
		try {
			await db.execute({
				sql: `
          INSERT INTO posts_registry (slug, content_hash, webdav_path, last_checked_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            content_hash = excluded.content_hash,
            webdav_path = excluded.webdav_path,
            last_checked_at = excluded.last_checked_at
        `,
				args: [
					entry.slug,
					entry.content_hash,
					entry.webdav_path,
					entry.last_checked_at,
				],
			})
		} catch (err) {
			logError(
				`CacheSystem.upsertRegistryEntry: failed for slug "${entry.slug}"`,
				err,
			)
		}
	},

	async getAllRegistryEntries(): Promise<PostRegistryEntry[]> {
		try {
			const result = await db.execute({
				sql: 'SELECT slug, content_hash, webdav_path, last_checked_at FROM posts_registry',
				args: [],
			})
			return result.rows.map((row) => ({
				slug: row.slug as string,
				content_hash: row.content_hash as string,
				webdav_path: row.webdav_path as string,
				last_checked_at: row.last_checked_at as number,
			}))
		} catch (err) {
			logError('CacheSystem.getAllRegistryEntries: failed', err)
			return []
		}
	},

	// ── Utility Functions ────────────────────────────────────────
	computeContentHash(content: string): string {
		return createHash('sha256').update(content, 'utf8').digest('hex')
	},

	computePostEtag(contentHash: string, frontmatterVersion = 1): string {
		const data = `${contentHash}:${frontmatterVersion}`
		return `"${createHash('sha256').update(data).digest('hex').slice(0, 16)}"`
	},

	computeListEtag(
		posts: Array<{
			slug: string
			published: string
			updated: string
			content_hash: string
		}>,
	): string {
		const sorted = [...posts].sort((a, b) => a.slug.localeCompare(b.slug))
		const data = sorted
			.map((p) => `${p.slug}:${p.published}:${p.updated}:${p.content_hash}`)
			.join('|')
		return `"${createHash('sha256').update(data).digest('hex').slice(0, 16)}"`
	},
}

export const withCache = async <T>(
	key: string,
	ttl: number,
	fn: () => Promise<T>,
): Promise<T> => {
	const now = Math.floor(Date.now() / 1000)

	try {
		const result = await db.execute({
			sql: 'SELECT value FROM cache WHERE key = ? AND expires_at > ?',
			args: [key, now],
		})
		const row = result.rows[0]
		if (row) return JSON.parse(row.value as string) as T
	} catch (err) {
		logError(`withCache: failed to read key "${key}"`, err)
	}

	const data = await fn()

	if (data !== null && data !== undefined) {
		try {
			await db.execute({
				sql: 'INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)',
				args: [key, JSON.stringify(data), now + ttl],
			})
			await db.execute({
				sql: 'DELETE FROM cache WHERE expires_at < ?',
				args: [now],
			})
		} catch (err) {
			logError(`withCache: failed to write key "${key}"`, err)
		}
	}

	return data
}
