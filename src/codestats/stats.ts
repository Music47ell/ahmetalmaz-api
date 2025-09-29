import { USERNAME } from '../utils/helpers.js'
import { CodeStats } from '../types.js'

export const getCodeStatsStats = async () => {
	const response = await fetch(`https://codestats.net/api/users/${USERNAME}`)

	const data = (await response.json()) as CodeStats

	data.user = USERNAME || ''
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
}