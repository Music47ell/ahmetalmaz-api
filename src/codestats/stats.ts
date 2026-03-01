import type { CodeStats } from '../types.js'
import { withCache } from '../utils/cache.js'

export const getCodeStatsStats = async () =>
	withCache('codestats:stats', 3600, async () => {
		const response = await fetch(
			`https://codestats.net/api/users/${process.env.USERNAME}`,
		)

		const data = (await response.json()) as CodeStats

		data.user = process.env.USERNAME || ''
		data.previous_xp = data?.total_xp - data?.new_xp
		data.level = Math.floor(0.025 * Math.sqrt(data?.total_xp - data?.new_xp))

		const stats = {
			user: data.user,
			level: data.level,
			total_xp: data.total_xp,
			previous_xp: data.total_xp - data.new_xp,
			new_xp: data.new_xp,
		}

		return stats
	})
