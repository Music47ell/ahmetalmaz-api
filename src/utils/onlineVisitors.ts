import { db } from '../db.js'

const TTL = 30 // seconds

export const upsertOnlineVisitor = async (visitorId: string, slug: string) => {
	const now = Math.floor(Date.now() / 1000)
	await db.execute({
		sql: 'INSERT OR REPLACE INTO online_visitors (visitor_id, slug, last_seen) VALUES (?, ?, ?)',
		args: [visitorId, slug || '/', now],
	})
	await db.execute({
		sql: 'DELETE FROM online_visitors WHERE last_seen < ?',
		args: [now - TTL],
	})
}

export const getOnlineVisitors = async () => {
	const now = Math.floor(Date.now() / 1000)
	const result = await db.execute({
		sql: 'SELECT slug FROM online_visitors WHERE last_seen > ?',
		args: [now - TTL],
	})

	const pages: Record<string, number> = {}
	for (const row of result.rows) {
		const s = (row.slug as string) || '/'
		pages[s] = (pages[s] || 0) + 1
	}

	return { total: result.rows.length, pages }
}
