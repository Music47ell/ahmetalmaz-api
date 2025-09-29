import { USERNAME, logError, normalize } from '../utils/helpers.js'
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
        artist: mbidMapping?.artists?.[0]?.artist_credit_name || meta.artist_name,
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
        if (track.caa_id && track.caa_release_mbid) {
          try {
            const coverUrl = `https://coverartarchive.org/release/${track.caa_release_mbid}/${track.caa_id}.jpg`
            const head = await fetch(coverUrl, { method: 'HEAD' })
            track.image = head.ok
              ? coverUrl
              : `https://coverartarchive.org/release/${track.caa_release_mbid}/front`
          } catch (err) {
            console.warn(`CAA fetch failed for ${track.artist} - ${track.title}:`, err)
          }
        } else if (track.release_mbid) {
          track.image = `https://coverartarchive.org/release/${track.release_mbid}/front`
        }

        if (!track.image) {
          try {
            const resp = await fetch(
              `https://api.deezer.com/search/track?q=${encodeURIComponent(`${track.title} ${track.artist}`)}`
            )
            const data = await resp.json()
            if (data.data?.length > 0) {
              const match = data.data.find(
                (t: any) =>
                  normalize(t.artist.name) === normalize(track.artist) &&
                  normalize(t.title) === normalize(track.title)
              )
              if (match) track.image = match.album.cover_xl
            }
          } catch (err) {
            console.warn(`Deezer image fetch failed for ${track.artist} - ${track.title}:`, err)
          }
        }

        try {
          const resp = await fetch(
            `https://api.deezer.com/search/track?q=${encodeURIComponent(`${track.title} ${track.artist}`)}&limit=1`
          )
          const data = await resp.json()
          if (data.data?.length > 0) {
            const exact = data.data.find(
              (t: any) =>
                normalize(t.artist.name) === normalize(track.artist) &&
                normalize(t.title) === normalize(track.title)
            )
            track.preview = exact?.preview || data.data[0].preview || ''
          }
        } catch (err) {
          console.warn(`Deezer preview fetch failed for ${track.artist} - ${track.title}:`, err)
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
