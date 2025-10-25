import { USERNAME, TRAKT_CLIENT_ID } from '../utils/helpers.js'
import { getTMDBData } from '../tmdb/index.js'

export interface Movie {
  title: string
  poster: string
  url: string
}

export const getWatchedMovies = async (): Promise<Movie[]> => {
  const endpoint = `https://api.trakt.tv/users/${USERNAME}/history/movies?page=1&limit=20`
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    } as HeadersInit,
  })

  const traktMovies = (await res.json()) as { movie: { ids: { tmdb: number } } }[]
  const ids = Array.from(new Set(traktMovies.map(m => m.movie.ids.tmdb))).slice(0, 20)

  const movies = (await Promise.all(
    ids.map(async (tmdbId) => {
      const tmdb = await getTMDBData(tmdbId, 'movies')
      const data = await tmdb.json()
      if (!data.poster_path || !data.title) return null
      return {
        title: data.title,
        poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
        url: `https://www.themoviedb.org/movie/${tmdbId}`,
      }
    }),
  )).filter(Boolean) as Movie[]

  return movies
}
