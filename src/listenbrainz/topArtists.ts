import { USERNAME, logError } from '../utils/helpers.js'
import type { ArtistInfo } from '../types.js'

const PLACEHOLDER_IMAGE = 'https://cdn-images.dzcdn.net/images/artist//250x250-000000-80-0-0.jpg'

export const getTopArtists = async (): Promise<ArtistInfo[]> => {
  try {
    const res = await fetch(
      `https://api.listenbrainz.org/1/stats/user/${USERNAME}/artists?range=month&count=10`
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
          const deezerUrl = `https://api.deezer.com/search/artist?q=${query}&limit=1`
          const deezerRes = await fetch(deezerUrl)

          if (!deezerRes.ok) {
            logError(`Deezer fetch failed for ${artist.name}: ${deezerRes.statusText}`)
            artist.image = PLACEHOLDER_IMAGE
            return artist
          }

          const deezerData = await deezerRes.json()
          const first = deezerData.data?.[0]

          if (first) {
            artist.image = first.picture_medium || first.picture || PLACEHOLDER_IMAGE
          } else {
            artist.image = PLACEHOLDER_IMAGE
          }
        } catch (err) {
          logError(`Error fetching Deezer data for ${artist.name}`, err)
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
