import { db } from '../db.js'
import { logError } from './helpers.js'

const pruneCache = db.query('DELETE FROM cache WHERE expires_at < ?')

export const withCache = async <T>(
	key: string,
	ttl: number,
	fn: () => Promise<T>,
): Promise<T> => {
	const now = Math.floor(Date.now() / 1000)

	try {
		const row = db
			.query<{ value: string }, [string, number]>(
				'SELECT value FROM cache WHERE key = ? AND expires_at > ?',
			)
			.get(key, now)
		if (row) return JSON.parse(row.value) as T
	} catch {
		// cache miss or corrupted data – fall through to fetch
	}

	const data = await fn()

	try {
		db
			.query('INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)')
			.run(key, JSON.stringify(data), now + ttl)
		pruneCache.run(now)
	} catch (err) {
		logError(`withCache: failed to write key "${key}"`, err)
	}

	return data
}
