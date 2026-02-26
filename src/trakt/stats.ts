import { withCache } from '../utils/cache.js'

export const getTraktStats = async () =>
  withCache("trakt:stats", 3600, async () => {
  const endpoint = `https://api.trakt.tv/users/${process.env.USERNAME}/stats`
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': process.env.TRAKT_CLIENT_ID,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    } as HeadersInit,
  })

  return (await res.json()) as {
    movies: number
    shows: number
    episodes: number
    people: number
    networks: number
  }
})
