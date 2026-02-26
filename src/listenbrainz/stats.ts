import { withCache } from "../utils/cache.js";

export const getListenBrainzStats = async () =>
  withCache("listenbrainz:stats", 3600, async () => {
  const endpoints = {
    listenActivity: `https://api.listenbrainz.org/1/stats/user/${process.env.USERNAME}/listening-activity`,
    listenCount: `https://api.listenbrainz.org/1/user/${process.env.USERNAME}/listen-count`,
    artistCount: `https://api.listenbrainz.org/1/stats/user/${process.env.USERNAME}/artists?count=0`,
    albumCount: `https://api.listenbrainz.org/1/stats/user/${process.env.USERNAME}/releases?count=0`,
    tracksCount: `https://api.listenbrainz.org/1/stats/user/${process.env.USERNAME}/recordings?count=0`,
  }

  const [activityRes, listenRes, artistRes, albumRes, trackRes] = await Promise.all(
    Object.values(endpoints).map(url => fetch(url))
  )

  const [activityJson, listenJson, artistJson, albumJson, trackJson] = await Promise.all(
    [activityRes, listenRes, artistRes, albumRes, trackRes].map(r => r.json())
  )

  const listenActivity = activityJson.payload.listening_activity
  let accountAge = Number.POSITIVE_INFINITY
  for (const entry of listenActivity) {
    if (entry.listen_count !== 0 && Number(entry.time_range) < accountAge) {
      accountAge = new Date().getFullYear() - Number(entry.time_range)
    }
  }

  return {
    accountAge,
    listensCount: listenJson.payload.count,
    artistsCount: artistJson.payload.total_artist_count,
    albumsCount: albumJson.payload.total_release_count,
    tracksCount: trackJson.payload.total_recording_count,
  }
})
