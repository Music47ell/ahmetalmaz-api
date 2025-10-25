import { Hono } from 'hono'

import { getFullMessage } from '../src/curl-card/index.js'

import { getListenBrainzStats } from '../src/listenbrainz/stats.js'
import { getNowPlaying } from '../src/listenbrainz/nowPlaying.js'
import { getRecentTracks } from '../src/listenbrainz/recentTracks.js'
import { getTopAlbums } from '../src/listenbrainz/topAlbums.js'
import { getTopArtists } from '../src/listenbrainz/topArtists.js'

import { getTraktStats } from '../src/trakt/stats.js'
import { getNowWatching } from '../src/trakt/nowWatching.js'
import { getWatchedMovies } from '../src/trakt/watchedMovies.js'
import { getWatchedShows } from '../src/trakt/watchedShows.js'

import { getCodeStatsStats } from '../src/codestats/stats.js'
import { getTopLanguages } from '../src/codestats/topLanguages.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: process.env.DOMAIN,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.get('/', async (c) => c.text(getFullMessage()))

app.get('/listenbrainz/stats', async (c) => c.json(await getListenBrainzStats()))
app.get('/listenbrainz/now-playing', async (c) => c.json(await getNowPlaying()))
app.get('/listenbrainz/recent-tracks', async (c) => c.json(await getRecentTracks()))
app.get('/listenbrainz/top-albums', async (c) => c.json(await getTopAlbums()))
app.get('/listenbrainz/top-artists', async (c) => c.json(await getTopArtists()))

app.get('/trakt/stats', async (c) => c.json(await getTraktStats()))
app.get('/trakt/now-watching', async (c) => c.json(await getNowWatching()))
app.get('/trakt/watched-movies', async (c) => c.json(await getWatchedMovies()))
app.get('/trakt/watched-shows', async (c) => c.json(await getWatchedShows()))

app.get('/codestats/stats', async (c) => c.json(await getCodeStatsStats()))
app.get('/codestats/top-languages', async (c) => c.json(await getTopLanguages()))

export default app
