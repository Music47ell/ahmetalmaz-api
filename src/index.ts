import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCodeStatsStats } from '../src/codestats/stats.js'
import { getTopLanguages } from '../src/codestats/topLanguages.js'
import { getFullMessage } from '../src/curl-card/index.js'
import { getGoodreadsReadBooks } from '../src/goodreads/readBooks.js'
import { getGoodreadsStats } from '../src/goodreads/stats.js'
import { getNowPlaying } from '../src/listenbrainz/nowPlaying.js'
import { getRecentTracks } from '../src/listenbrainz/recentTracks.js'
import { getListenBrainzStats } from '../src/listenbrainz/stats.js'
import { getMonkeyTypeStats } from '../src/monkeytype/stats.js'
import { getMonkeyTypeResults } from '../src/monkeytype/topResults.js'
import { getSimklStats } from '../src/simkl/stats.js'
import { getSimklWatchedAnime } from '../src/simkl/watchedAnime.js'
import { getSimklWatchedMovies } from '../src/simkl/watchedMovies.js'
import { getSimklWatchedShows } from '../src/simkl/watchedShows.js'
import { getNowWatching } from '../src/trakt/nowWatching.js'
import { getTraktStats } from '../src/trakt/stats.js'
import { getWatchedMovies } from '../src/trakt/watchedMovies.js'
import { getWatchedShows } from '../src/trakt/watchedShows.js'
import { getAnalytics, getBlogViewsBySlug, handleAnalytics } from '../src/turso'
import {
	getOnlineVisitors,
	upsertOnlineVisitor,
} from '../src/utils/onlineVisitors.js'

const app = new Hono()

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',')

app.use(
	'*',
	cors({
		origin: (origin) => {
			return origin && allowedOrigins.includes(origin)
				? origin
				: allowedOrigins[0]
		},
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: [
			'Content-Type',
			'Authorization',
			'continent',
			'country',
			'region',
			'region-code',
			'city',
			'latitude',
			'longitude',
			'timezone',
			'statusCode',
		],
	}),
)

app.get('/', async (c) => c.text(getFullMessage()))

app.get('/listenbrainz/stats', async (c) =>
	c.json(await getListenBrainzStats()),
)
app.get('/listenbrainz/now-playing', async (c) => c.json(await getNowPlaying()))
app.get('/listenbrainz/recent-tracks', async (c) =>
	c.json(await getRecentTracks()),
)

app.get('/trakt/stats', async (c) => c.json(await getTraktStats()))
app.get('/trakt/now-watching', async (c) => c.json(await getNowWatching()))
app.get('/trakt/watched-movies', async (c) => c.json(await getWatchedMovies()))
app.get('/trakt/watched-shows', async (c) => c.json(await getWatchedShows()))

app.get('/simkl/stats', async (c) => {
	try {
		return c.json(await getSimklStats())
	} catch (error) {
		return c.json({ error: (error as Error).message }, 500)
	}
})
app.get('/simkl/watched-movies', async (c) => {
	try {
		const dateFrom = c.req.query('date_from')
		return c.json(await getSimklWatchedMovies(dateFrom))
	} catch (error) {
		return c.json({ error: (error as Error).message }, 500)
	}
})
app.get('/simkl/watched-shows', async (c) => {
	try {
		const dateFrom = c.req.query('date_from')
		return c.json(await getSimklWatchedShows(dateFrom))
	} catch (error) {
		return c.json({ error: (error as Error).message }, 500)
	}
})
app.get('/simkl/watched-anime', async (c) => {
	try {
		const dateFrom = c.req.query('date_from')
		return c.json(await getSimklWatchedAnime(dateFrom))
	} catch (error) {
		return c.json({ error: (error as Error).message }, 500)
	}
})

app.get('/codestats/stats', async (c) => c.json(await getCodeStatsStats()))
app.get('/codestats/top-languages', async (c) =>
	c.json(await getTopLanguages()),
)

app.post('/correct-horse-battery-staple', (c) => handleAnalytics(c))

app.post('/heartbeat', async (c) => {
	const { visitorId, slug } = await c.req.json()
	if (!visitorId) return c.json({ error: 'Missing visitorId' }, 400)

	await upsertOnlineVisitor(visitorId, slug || '/')

	return c.json({ ok: true })
})
app.get('/online', async (c) => {
	return c.json(await getOnlineVisitors())
})

app.get('/insight', async (c) => c.json(await getAnalytics()))
app.get('/insight/:slug', async (c) => {
	const { slug } = c.req.param()
	const views = await getBlogViewsBySlug(slug)
	return c.json({ views })
})

app.get('/goodreads/stats', async (c) => c.json(await getGoodreadsStats()))
app.get('/goodreads/books-read', async (c) =>
	c.json(await getGoodreadsReadBooks()),
)

app.get('/monkeytype/stats', async (c) => {
	try {
		const stats = await getMonkeyTypeStats()
		return c.json(stats)
	} catch (error) {
		return c.json({ error: (error as Error).message }, 500)
	}
})
app.get('/monkeytype/results', async (c) => {
	try {
		const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 100)
		const results = await getMonkeyTypeResults(limit)
		return c.json(results)
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		return c.json({ error: errorMessage }, 500)
	}
})

// Cloudflare Workers compatible export
export default app
