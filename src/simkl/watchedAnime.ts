import { withCache } from '../utils/cache.js'

export interface SimklAnime {
	title: string
	poster: string
	url: string
	rating: number | null
	year?: number
}

type SimklAnimeItem = {
	last_watched_at: string
	user_rating?: number
	anime: {
		title: string
		year: number
		ids: {
			simkl_id: number
			slug: string
			anilist?: number
			mal?: number
		}
	}
}

export const getSimklWatchedAnime = async (
	dateFrom?: string,
): Promise<SimklAnime[]> =>
	withCache(
		dateFrom ? `simkl:watched-anime:${dateFrom}` : 'simkl:watched-anime',
		1800,
		async () => {
			const endpoint = new URL(
				'https://api.simkl.com/sync/all-items/anime/watched',
			)

			if (dateFrom) {
				endpoint.searchParams.set('date_from', dateFrom)
			}

			const res = await fetch(endpoint.toString(), {
				headers: {
					'Content-Type': 'application/json',
					'simkl-api-key': process.env.SIMKL_CLIENT_ID || '',
					Authorization: `Bearer ${process.env.SIMKL_ACCESS_TOKEN}`,
				} as HeadersInit,
			})

			if (!res.ok) {
				throw new Error(`Simkl API error: ${res.status}`)
			}

			const data = await res.json()

			// Handle different response structures
			const animeList = data.anime || data.shows || data || []

			// Filter and sort
			const sortedAnime = animeList
				.filter((item: any) => item && (item.anime || item.show))
				.sort(
					(a: any, b: any) =>
						new Date(b.last_watched_at || 0).getTime() -
						new Date(a.last_watched_at || 0).getTime(),
				)
				.slice(0, 10)

			return sortedAnime.map((item: any) => {
				const anime = item.anime || item.show || {}
				const ids = anime.ids || {}
				const posterPath = anime.poster || ''

				return {
					title: anime.title || 'Unknown',
					poster: posterPath
						? `https://wsrv.nl/?url=https://simkl.in/posters/${posterPath}_m.jpg`
						: '',
					url: `https://simkl.com/anime/${ids.simkl}/${ids.slug || ''}`,
					rating: item.user_rating || null,
					year: anime.year || null,
				}
			})
		},
	)
