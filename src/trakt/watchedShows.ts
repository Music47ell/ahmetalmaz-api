import { USERNAME, TRAKT_CLIENT_ID } from '../utils/helpers.js'
import { getTMDBData } from '../tmdb/index.js'

export interface Show {
  title: string
  poster: string
  url: string
}

export const getWatchedShows = async (): Promise<Show[]> => {
  const endpoint = `https://api.trakt.tv/users/${USERNAME}/history/shows?limit=1000`
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    } as HeadersInit,
  })

  const traktShows = (await res.json()) as { show: { ids: { tmdb: number } } }[]
  const ids = Array.from(new Set(traktShows.map(s => s.show.ids.tmdb))).slice(0, 20)

  const shows = (await Promise.all(
    ids.map(async (tmdbId) => {
      const tmdb = await getTMDBData(tmdbId, 'shows')
      const data = await tmdb.json()
      if (!data.poster_path || !data.name) return null
      return {
        title: data.name,
        poster: `https://image.tmdb.org/t/p/original${data.poster_path}`,
        url: `https://www.themoviedb.org/tv/${tmdbId}`,
      }
    }),
  )).filter(Boolean) as Show[]

  return shows
}
