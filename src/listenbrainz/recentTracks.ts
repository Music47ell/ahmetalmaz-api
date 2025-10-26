import { API_URL, USERNAME, logError, normalize } from '../utils/helpers.js'
import type { TrackInfo } from '../types.js'

export const getRecentTracks = async (): Promise<TrackInfo[]> => {
  try {
    const res = await fetch(
      `https://api.listenbrainz.org/1/user/${USERNAME}/listens?count=10`
    )
    const { payload } = await res.json()

    const tracks: TrackInfo[] = payload.listens.map((record: any) => {
      const meta = record.track_metadata
      const mbidMapping = meta.mbid_mapping || {}

      return {
        artist: mbidMapping.artists?.[0]?.artist_credit_name || meta.artist_name,
        title: meta.track_name,
        image: '',
        preview: '',
        mbid: mbidMapping.recording_mbid || '',
        release_mbid: mbidMapping.release_mbid || '',
        caa_id: mbidMapping.caa_id || null,
        caa_release_mbid: mbidMapping.caa_release_mbid || null,
      }
    })

    await Promise.all(
      tracks.map(async (track) => {
        // 1. Try Cover Art Archive
        if (track.caa_id && track.caa_release_mbid) {
          try {
            const metadataUrl = `${API_URL}/caa/${track.caa_release_mbid}`
            const resp = await fetch(metadataUrl)
            console.log(resp)
            if (resp.ok) {
              const data = await resp.json()
              const imageObj = data.images?.find((img: any) => img.id === track.caa_id)
              track.image = imageObj?.thumbnails?.large || imageObj?.image || ''
            }
          } catch (err) {
            console.warn(`CAA fetch failed for ${track.artist} - ${track.title}:`, err)
          }
        } else if (track.release_mbid) {
          track.image = `${API_URL}/caa/${track.release_mbid}/front-500`
        }

        // 2. Fallback to Deezer for image + preview
        if (!track.image || !track.preview) {
          try {
            const query = encodeURIComponent(`${track.title} ${track.artist}`)
            const resp = await fetch(`https://api.deezer.com/search/track?q=${query}&limit=5`)
            const data = await resp.json()
            if (data.data?.length > 0) {
              const match = data.data.find(
                (t: any) =>
                  normalize(t.artist.name) === normalize(track.artist) &&
                  normalize(t.title) === normalize(track.title)
              ) || data.data[0]

              track.image = track.image || match.album?.cover_medium || ''
              track.preview = track.preview || match.preview || ''
            }
          } catch (err) {
            console.warn(`Deezer fetch failed for ${track.artist} - ${track.title}:`, err)
          }
        }

        if (!track.image) {
          console.warn(`No image found for: ${track.artist} - ${track.title}`)
        }
      })
    )

    return tracks
  } catch (err) {
    logError('Error fetching recent tracks', err)
    return []
  }
}
