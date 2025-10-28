import { API_URL, USERNAME, logError } from '../utils/helpers.js'
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
          // Ask our Hono Deezer proxy for the artist picture
          const deezerUrl = `${API_URL}/deezer?type=artist&q=${encodeURIComponent(artist.name)}`
          const coverRes = await fetch(deezerUrl)

          if (coverRes.ok) {
            // The proxy returns the image stream, so just use its URL
            artist.image = deezerUrl
          } else {
            logError(`Deezer proxy returned ${coverRes.status} for ${artist.name}`)
          }
        } catch (err) {
          logError(`Deezer proxy fetch failed for ${artist.name}`, err)
        }

        // Final fallback: placeholder
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
