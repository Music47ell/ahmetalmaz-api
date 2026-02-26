import { getTMDBData } from '../tmdb/index.js'
import { withCache } from '../utils/cache.js'

export interface Movie {
  title: string
  poster: string
  url: string
  rating: number | null
}

type TraktHistoryItem = {
  movie: {
    ids: {
      tmdb: number
    }
  }
}

type TraktRatingItem = {
  rating: number
  movie: {
    ids: {
      tmdb: number
    }
  }
}

export const getWatchedMovies = async (): Promise<Movie[]> =>
  withCache("trakt:watched-movies", 1800, async () => {
  const headers = {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID!,
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  } as HeadersInit

  const historyRes = await fetch(
    `https://api.trakt.tv/users/${process.env.USERNAME}/history/movies?page=1&limit=10`,
    { headers }
  )

  const traktMovies = (await historyRes.json()) as TraktHistoryItem[]

  const tmdbIds = Array.from(
    new Set(traktMovies.map((m) => m.movie.ids.tmdb))
  )

  const ratingsRes = await fetch(
    `https://api.trakt.tv/users/${process.env.USERNAME}/ratings/movies`,
    { headers }
  )

  const traktRatings = (await ratingsRes.json()) as TraktRatingItem[]

  const ratingMap = new Map<number, number>()
  for (const item of traktRatings) {
    if (item.movie?.ids?.tmdb) {
      ratingMap.set(item.movie.ids.tmdb, item.rating)
    }
  }

  const movies = (
    await Promise.all(
      tmdbIds.map(async (tmdbId) => {
        const tmdbRes = await getTMDBData(tmdbId, 'movies')
        const data = await tmdbRes.json()

        if (!data.poster_path || !data.title) return null

        return {
          title: data.title,
          poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
          url: `https://www.themoviedb.org/movie/${tmdbId}`,
          rating: ratingMap.get(tmdbId) ?? null,
        }
      })
    )
  ).filter(Boolean) as Movie[]

  return movies
})
