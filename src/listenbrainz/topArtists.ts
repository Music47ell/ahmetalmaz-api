import { USERNAME, logError, normalize } from '../utils/helpers.js'
import type { ArtistInfo } from '../types.js'

export const getTopArtists = async (): Promise<ArtistInfo[]> => {
  try {
    const res = await fetch(
      `https://api.listenbrainz.org/1/stats/user/${USERNAME}/artists?range=this_month&count=10`
    )
    if (!res.ok) return []

    const { payload } = await res.json()

    const artists: ArtistInfo[] = await Promise.all(
      payload.artists.map(async (a: any) => {
        const artist: ArtistInfo = {
          name: a.artist_name,
          artist_mbid: a.artist_mbid || '',
          image: '',
        }

        try {
          const resp = await fetch(
            `https://api.deezer.com/search/artist?q=${encodeURIComponent(artist.name)}`
          )
          const data = await resp.json()
          if (data.data?.length > 0) {
            const match = data.data.find(
              (d: any) => normalize(d.name) === normalize(artist.name)
            )
            if (match) artist.image = match.picture_xl
          }
        } catch (err) {
          console.warn(`Deezer artist search failed for ${artist.name}:`, err)
        }

        if (!artist.image) {
          try {
            const resp = await fetch(
              `https://api.deezer.com/search/album?q=${encodeURIComponent(artist.name)}`
            )
            const data = await resp.json()
            if (data.data?.length > 0) {
              const match = data.data.find(
                (album: any) => normalize(album.artist.name) === normalize(artist.name)
              )
              if (match) artist.image = match.cover_xl
            }
          } catch (err) {
            console.warn(`Deezer album search failed for ${artist.name}:`, err)
          }
        }

        if (!artist.image) {
          console.warn(`No image found for artist: ${artist.name}`)
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
