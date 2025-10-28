import { API_URL, USERNAME, logError } from '../utils/helpers.js'
import type { AlbumInfo } from '../types.js'

const PLACEHOLDER_IMAGE = 'https://cdn-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg'

export const getTopAlbums = async (): Promise<AlbumInfo[]> => {
  try {
    const res = await fetch(
      `https://api.listenbrainz.org/1/stats/user/${USERNAME}/releases?range=this_month&count=10`
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
          release_mbid: release.release_mbid || null,
          caa_id: release.caa_id || null,
          caa_release_mbid: release.caa_release_mbid || null,
          image: '',
        }

        // Prefer title + artist for best Deezer search accuracy
        const query = `${album.title} ${album.artist}`.trim()

        try {
          // Ask our Hono Deezer proxy for the album cover
          const deezerUrl = `${API_URL}/deezer?type=album&q=${encodeURIComponent(query)}`
          const coverRes = await fetch(deezerUrl)

          if (coverRes.ok) {
            // The proxy returns the image itself, not JSON, so just use the same URL
            album.image = deezerUrl
          } else {
            logError(`Deezer proxy returned ${coverRes.status} for ${query}`)
          }
        } catch (err) {
          logError(`Failed Deezer fetch for ${query}`, err)
        }

        // FINAL FALLBACK: placeholder
        if (!album.image) {
          console.warn(`No cover art found for: ${album.artist} - ${album.title}`)
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
