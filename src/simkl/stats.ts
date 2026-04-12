import { withCache } from '../utils/cache.js'

export const getSimklStats = async () => {
	return withCache('simkl:stats', 3600, async () => {
		const endpoint = `https://api.simkl.com/users/${process.env.SIMKL_USER_ID}/stats`
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'simkl-api-key': process.env.SIMKL_CLIENT_ID || '',
				Authorization: `Bearer ${process.env.SIMKL_ACCESS_TOKEN}`,
			} as HeadersInit,
		})

		if (!res.ok) {
			throw new Error(`Simkl API error: ${res.status}`)
		}

		console.log(res)

		const data = await res.json()

		// Helper to convert minutes to days
		const minutesToDays = (mins: number) => Math.floor(mins / 1440)

		// Only count completed (watched) items
		const moviesWatched = data.movies?.completed?.count || 0
		const moviesMinutes = data.movies?.completed?.mins || 0

		// Separate TV and Anime
		const tvShowsWatched = data.tv?.completed?.count || 0
		const tvEpisodesWatched = data.tv?.completed?.watched_episodes_count || 0
		const tvMinutes = data.tv?.total_mins || 0

		const animeWatched = data.anime?.completed?.count || 0
		const animeEpisodesWatched =
			data.anime?.completed?.watched_episodes_count || 0
		const animeMinutes = data.anime?.total_mins || 0

		// Total days from SIMKL's total_mins
		const totalDays = minutesToDays(data.total_mins || 0)

		return {
			totalDays,
			episodes: {
				watched: tvEpisodesWatched + animeEpisodesWatched,
			},
			movies: {
				watched: moviesWatched,
				minutes: moviesMinutes,
				days: minutesToDays(moviesMinutes),
			},
			shows: {
				watched: tvShowsWatched,
				minutes: tvMinutes,
				days: minutesToDays(tvMinutes),
			},
			anime: {
				watched: animeWatched,
				minutes: animeMinutes,
				days: minutesToDays(animeMinutes),
			},
		}
	})
}
