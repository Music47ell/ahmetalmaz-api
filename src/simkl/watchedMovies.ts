import { withCache } from '../utils/cache.js'

export interface SimklMovie {
	title: string
	poster: string
	url: string
	rating: number | null
	year?: number
}

type SimklMovieItem = {
	last_watched_at: string
	user_rating?: number
	movie: {
		title: string
		year: number
		ids: {
			simkl_id: number
			slug: string
			tmdb?: number
			imdb?: string
		}
	}
}

export const getSimklWatchedMovies = async (
	dateFrom?: string,
): Promise<SimklMovie[]> =>
	withCache(
		dateFrom ? `simkl:watched-movies:${dateFrom}` : 'simkl:watched-movies',
		1800,
		async () => {
			const endpoint = new URL(
				'https://api.simkl.com/sync/all-items/movies/watched',
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

			const moviesList = data.movies || data || []

			// Sort by last watched and take top 10
			const sortedMovies = moviesList
				.filter((item: any) => item && item.movie)
				.sort(
					(a: any, b: any) =>
						new Date(b.last_watched_at || 0).getTime() -
						new Date(a.last_watched_at || 0).getTime(),
				)
				.slice(0, 10)

			return sortedMovies.map((item: any) => {
				const movie = item.movie || {}
				const ids = movie.ids || {}
				const posterPath = movie.poster || ''

				return {
					title: movie.title || 'Unknown',
					poster: posterPath
						? `https://wsrv.nl/?url=https://simkl.in/posters/${posterPath}_m.jpg`
						: '',
					url: `https://simkl.com/movies/${ids.simkl}/${ids.slug || ''}`,
					rating: item.user_rating || null,
					year: movie.year || null,
				}
			})
		},
	)
