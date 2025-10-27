import { API_URL, USERNAME, logError, normalize } from '../utils/helpers.js'
import type { ArtistInfo } from '../types.js'

const PLACEHOLDER_IMAGE = 'https://cdn-images.dzcdn.net/images/artist//250x250-000000-80-0-0.jpg'

export const getTopArtists = async (): Promise<ArtistInfo[]> => {
  try {
    const res = await fetch(
      `https://api.listenbrainz.org/1/stats/user/${USERNAME}/artists?range=this_month&count=10`
    )
    if (!res.ok) {
      logError(`Failed to fetch top artists: ${res.statusText}`)
      return []
    }

    const { payload } = await res.json()

    const artists: ArtistInfo[] = await Promise.all(
      payload.artists.map(async (a: any) => {
        const artist: ArtistInfo = {
          name: a.artist_name,
          artist_mbid: a.artist_mbid || '',
          image: '',
        }

        try {
          const query = encodeURIComponent(artist.name)

          // --- Use proxy for Deezer artist search ---
          const resp = await fetch(`${API_URL}/caa/none?deezerType=artist&q=${query}`)
          if (resp.ok) {
            const data = await resp.json()
            artist.image = data.image || ''
          } else {
            console.warn(`Proxy artist lookup failed for ${artist.name}`)
          }
        } catch (err) {
          console.warn(`Proxy artist search failed for ${artist.name}:`, err)
        }

        // Fallback: use Deezer album via proxy
        if (!artist.image) {
          try {
            const query = encodeURIComponent(artist.name)
            const resp = await fetch(`${API_URL}/caa/none?deezerType=album&q=${query}`)
            if (resp.ok) {
              const data = await resp.json()
              artist.image = data.image || ''
            }
          } catch (err) {
            console.warn(`Proxy album search failed for ${artist.name}:`, err)
          }
        }

        if (!artist.image) {
          console.warn(`No image found for artist: ${artist.name}`)
          artist.image = PLACEHOLDER_IMAGE
        }

        return artist
      })
    )

    return artists
  } catch (err) {
    logError('Error fetching top artists', err)
    return []
  }
}
