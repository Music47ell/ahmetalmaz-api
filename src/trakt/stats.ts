import { USERNAME, TRAKT_CLIENT_ID } from '../utils/helpers.js'

export const getTraktStats = async () => {
  const endpoint = `https://api.trakt.tv/users/${USERNAME}/stats`
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
    } as HeadersInit,
  })

  return (await res.json()) as {
    movies: number
    shows: number
    episodes: number
    people: number
    networks: number
  }
}
