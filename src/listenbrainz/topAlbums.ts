import { USERNAME, logError } from '../utils/helpers.js'
import type { AlbumInfo } from '../types.js'

const PLACEHOLDER_IMAGE = 'https://cdn-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg'

export const getTopAlbums = async (): Promise<AlbumInfo[]> => {
  try {
    const res = await fetch(
      `https://api.listenbrainz.org/1/stats/user/${USERNAME}/releases?range=month&count=10`
    )

    if (!res.ok) {
      logError(`Failed to fetch top albums: ${res.statusText}`)
      return []
    }

    const { payload } = await res.json()

    const albums: AlbumInfo[] = await Promise.all(
      payload.releases.map(async (release: any) => {
        const album: AlbumInfo = {
          artist: release.artist_name,
          title: release.release_name,
          image: '',
        }

        const query = encodeURIComponent(`${album.title} ${album.artist}`)

        try {
          // Fetch directly from Deezer search API
          const deezerUrl = `https://api.deezer.com/search/album?q=${query}&limit=1`
          const deezerRes = await fetch(deezerUrl)

          if (!deezerRes.ok) {
            logError(`Deezer fetch failed for ${album.artist} - ${album.title}: ${deezerRes.statusText}`)
            album.image = PLACEHOLDER_IMAGE
            return album
          }

          const deezerData = await deezerRes.json()
          const first = deezerData.data?.[0]

          if (first) {
            album.image = first.cover_medium || first.cover || PLACEHOLDER_IMAGE
          } else {
            album.image = PLACEHOLDER_IMAGE
          }
        } catch (err) {
          logError(`Error fetching Deezer data for ${album.artist} - ${album.title}`, err)
          album.image = PLACEHOLDER_IMAGE
        }

        return album
      })
    )

    return albums
  } catch (err) {
    logError('Error fetching top albums', err)
    return []
  }
}
