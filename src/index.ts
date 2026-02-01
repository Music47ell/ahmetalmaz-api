import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bearerAuth } from 'hono/bearer-auth'

import { getFullMessage } from '../src/curl-card/index.js'

import { generateOg } from './ogGenerator/index.js';

import { getListenBrainzStats } from '../src/listenbrainz/stats.js'
import { getNowPlaying } from '../src/listenbrainz/nowPlaying.js'
import { getRecentTracks } from '../src/listenbrainz/recentTracks.js'

import { getTraktStats } from '../src/trakt/stats.js'
import { getNowWatching } from '../src/trakt/nowWatching.js'
import { getWatchedMovies } from '../src/trakt/watchedMovies.js'
import { getWatchedShows } from '../src/trakt/watchedShows.js'

import { getCodeStatsStats } from '../src/codestats/stats.js'
import { getTopLanguages } from '../src/codestats/topLanguages.js'

import { getUmamiStats } from '../src/umami/stats.js'

const app = new Hono()

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',')

app.use(
  '*',
  cors({
    origin: (origin) => {
      // If origin is in the list, allow it; otherwise fallback to first domain
      return origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
)


app.get('/', async (c) => c.text(getFullMessage()))

app.get('/og', async (c) => {
const rawUrl = c.req.raw.url.includes('&amp;')
  ? c.req.raw.url.replace(/&amp;/g, '&')
  : c.req.raw.url;

const params = new URLSearchParams(rawUrl.split('?')[1] ?? '');


const title = params.get('title') ?? 'Default Title';
const description = params.get('description') ?? 'Default Description';
const pubdate = params.get('pubdate') ?? '2025-12-31';

  try {
    const domain = 'ahmetalmaz.com';

    const image = await generateOg(title, description, pubdate, domain);

    c.header('Content-Type', 'image/png');
    return c.body(image);
  } catch (error) {
    console.error(error);
    return c.json({ error: error.message || 'Failed to generate image' }, 500);
  }
});

app.get('/listenbrainz/stats', async (c) => c.json(await getListenBrainzStats()))
app.get('/listenbrainz/now-playing', async (c) => c.json(await getNowPlaying()))
app.get('/listenbrainz/recent-tracks', async (c) => c.json(await getRecentTracks()))

app.get('/trakt/stats', async (c) => c.json(await getTraktStats()))
app.get('/trakt/now-watching', async (c) => c.json(await getNowWatching()))
app.get('/trakt/watched-movies', async (c) => c.json(await getWatchedMovies()))
app.get('/trakt/watched-shows', async (c) => c.json(await getWatchedShows()))

app.get('/codestats/stats', async (c) => c.json(await getCodeStatsStats()))
app.get('/codestats/top-languages', async (c) => c.json(await getTopLanguages()))

app.use('/umami/*', bearerAuth({ token: process.env.STATS_TOKEN }))
app.get('/umami/stats/:slug', async (c) => {
  const slug = c.req.param('slug')
  const stats = await getUmamiStats(slug) // Function to fetch stats
  return c.json(stats)
})


export default {
  port: 3000,
  hostname: "0.0.0.0",  // required for Docker
  fetch: app.fetch
}