import { USERNAME, TRAKT_CLIENT_ID } from '../utils/helpers.js'

export const getNowWatching = async () => {
  const endpoint = `https://api.trakt.tv/users/${USERNAME}/watching`
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
    } as HeadersInit,
  })

  if (res.status === 204) return { isPlaying: false }

  try {
    const data = await res.json()
    return { status: res.status, data }
  } catch {
    return { status: res.status }
  }
}
