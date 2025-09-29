import { USERNAME, logError } from '../utils/helpers.js'
import type { AlbumInfo } from '../types.js'

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

        if (album.caa_id && album.caa_release_mbid) {
          try {
            const coverUrl = `https://coverartarchive.org/release/${album.caa_release_mbid}/${album.caa_id}.jpg`
            const head = await fetch(coverUrl, { method: 'HEAD' })
            album.image = head.ok
              ? coverUrl
              : `https://coverartarchive.org/release/${album.caa_release_mbid}/front`
          } catch (err) {
            console.warn(`CAA fetch failed for ${album.title}:`, err)
            album.image = `https://coverartarchive.org/release/${album.caa_release_mbid}/front`
          }
        } else if (album.release_mbid) {
          album.image = `https://coverartarchive.org/release/${album.release_mbid}/front`
        }

        if (!album.image) {
          console.warn(`No cover art found for: ${album.artist} - ${album.title}`)
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
