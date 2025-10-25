import { USERNAME, logError } from '../utils/helpers.js'
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

        if (album.caa_release_mbid) {
          try {
            const metadataUrl = `https://coverartarchive.org/release/${album.caa_release_mbid}`
            const resp = await fetch(metadataUrl)
            if (resp.ok) {
              const data = await resp.json()
              let imageObj = album.caa_id
                ? data.images?.find((img: any) => img.id === album.caa_id)
                : data.images?.[0]

              album.image =
                imageObj?.thumbnails?.large ||
                imageObj?.thumbnails?.small ||
                imageObj?.image ||
                `https://coverartarchive.org/release/${album.caa_release_mbid}/front-500`
            }
          } catch (err) {
            console.warn(`CAA fetch failed for ${album.title}:`, err)
            album.image = `https://coverartarchive.org/release/${album.caa_release_mbid}/front-500`
          }
        } else if (album.release_mbid) {
          album.image = `https://coverartarchive.org/release/${album.release_mbid}/front-500`
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
