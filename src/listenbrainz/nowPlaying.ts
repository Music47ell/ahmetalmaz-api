import { USERNAME, logError } from '../utils/helpers.js'

export const getNowPlaying = async () => {
  const endpoint = `https://api.listenbrainz.org/1/user/${USERNAME}/playing-now`
  try {
    const res = await fetch(endpoint)
    const { payload } = await res.json()

    if (!payload.listens || payload.listens.length === 0) return { isPlaying: false }

    const track = payload.listens[0].track_metadata
    const trackInfo = { artist: track.artist_name, title: track.track_name, image: '', preview: '', isPlaying: true }

    const deezerRes = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(trackInfo.title)}&artist=${encodeURIComponent(trackInfo.artist)}`)
    const deezerData = await deezerRes.json()

    if (deezerData.data?.length) {
      const match = deezerData.data.find((t: any) =>
        t.title.toLowerCase() === trackInfo.title.toLowerCase() &&
        t.artist.name.toLowerCase() === trackInfo.artist.toLowerCase()
      )
      if (match) {
        trackInfo.image = match.album.cover_medium
        trackInfo.preview = match.preview
      }
    }

    return trackInfo
  } catch (err) {
    logError('Error fetching now playing track:', err)
    return { isPlaying: false }
  }
}
