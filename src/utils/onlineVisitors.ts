import { db } from '../db.js'

const TTL = 30 // seconds

const pruneVisitors = db.query(
	'DELETE FROM online_visitors WHERE last_seen < ?',
)

export const upsertOnlineVisitor = (visitorId: string, slug: string) => {
	const now = Math.floor(Date.now() / 1000)
	db.query(
		'INSERT OR REPLACE INTO online_visitors (visitor_id, slug, last_seen) VALUES (?, ?, ?)',
	).run(visitorId, slug || '/', now)
	pruneVisitors.run(now - TTL)
}

export const getOnlineVisitors = () => {
	const now = Math.floor(Date.now() / 1000)
	const rows = db
		.query<{ slug: string }, [number]>(
			'SELECT slug FROM online_visitors WHERE last_seen > ?',
		)
		.all(now - TTL)

	const pages: Record<string, number> = {}
	for (const row of rows) {
		const s = row.slug || '/'
		pages[s] = (pages[s] || 0) + 1
	}

	return { total: rows.length, pages }
}
