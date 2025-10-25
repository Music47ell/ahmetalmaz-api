import { USERNAME, logError, normalize } from '../utils/helpers.js'
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
          const resp = await fetch(`https://api.deezer.com/search/artist?q=${query}&limit=5`)
          const data = await resp.json()
          if (data.data?.length > 0) {
            const match = data.data.find(
              (d: any) => normalize(d.name) === normalize(artist.name)
            ) || data.data[0]

            artist.image = match.picture_medium || ''
          }
        } catch (err) {
          console.warn(`Deezer artist search failed for ${artist.name}:`, err)
        }

        // Fallback to album cover if artist picture not found
        if (!artist.image) {
          try {
            const query = encodeURIComponent(artist.name)
            const resp = await fetch(`https://api.deezer.com/search/album?q=${query}&limit=5`)
            const data = await resp.json()
            if (data.data?.length > 0) {
              const match = data.data.find(
                (album: any) => normalize(album.artist.name) === normalize(artist.name)
              ) || data.data[0]

              artist.image = match.cover_medium || ''
            }
          } catch (err) {
            console.warn(`Deezer album search failed for ${artist.name}:`, err)
          }
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
