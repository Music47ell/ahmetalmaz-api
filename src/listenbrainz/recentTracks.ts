import { API_URL, USERNAME, logError } from '../utils/helpers.js'
import type { TrackInfo } from '../types.js'

const PLACEHOLDER_IMAGE = 'https://cdn-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg'

export const getRecentTracks = async (): Promise<TrackInfo[]> => {
  try {
    const res = await fetch(`https://api.listenbrainz.org/1/user/${USERNAME}/listens?count=10`)
    if (!res.ok) {
      logError(`Failed to fetch recent tracks: ${res.statusText}`)
      return []
    }

    const { payload } = await res.json()

    const tracks: TrackInfo[] = await Promise.all(
      payload.listens.map(async (record: any) => {
        const meta = record.track_metadata
        const mbidMapping = meta.mbid_mapping || {}

        const track: TrackInfo = {
          artist: mbidMapping.artists?.[0]?.artist_credit_name || meta.artist_name,
          title: meta.track_name,
          image: PLACEHOLDER_IMAGE,
          preview: '',
          mbid: mbidMapping.recording_mbid || '',
          release_mbid: mbidMapping.release_mbid || '',
        }

        try {
          const query = encodeURIComponent(`${track.title} ${track.artist}`)
          const proxyUrl = `${API_URL}/deezer?type=track&q=${query}&format=json`
          const proxyRes = await fetch(proxyUrl)
          const data = await proxyRes.json()

          if (data) {
            track.image = data.image || track.image
            track.preview = data.preview || ''
          }
        } catch (err) {
          logError(`Deezer proxy fetch failed for ${track.artist} - ${track.title}`, err)
        }

        return track
      })
    )

    return tracks
  } catch (err) {
    logError('Error fetching recent tracks', err)
    return []
  }
}
