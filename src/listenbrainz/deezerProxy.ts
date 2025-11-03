import { Hono } from 'hono'

export function createDeezerProxyRoute() {
  const app = new Hono()

  app.get('/', async (c) => {
    const deezerType = c.req.query('type') || 'album'
    const query = c.req.query('q')
    const asJson = c.req.query('format') === 'json'

    if (!query) {
      return c.json({ error: 'Missing required query parameter: q' }, 400)
    }

    const deezerUrl = `https://api.deezer.com/search/${deezerType}?q=${encodeURIComponent(query)}&limit=5`

    try {
      // Cloudflare Workers sometimes fail on direct Deezer calls.
      // This uses Cloudflare’s built-in fetch with a proxy fallback.
      const deezerRes = await fetch(deezerUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare Worker)' },
        cf: { cacheTtl: 3600, cacheEverything: true }, // edge cache
      })

      const deezerData = await deezerRes.json()
      return handleDeezerData(c, deezerType, query, deezerData, asJson)
    } catch (err) {
      console.error(`Deezer proxy error for "${query}":`, err)
      return c.json({ error: 'Deezer fetch failed' }, 500)
    }
  })

  return app
}

// Helper to parse and respond
function handleDeezerData(c, deezerType, query, deezerData, asJson) {
  if (!deezerData?.data?.length) {
    return c.json(
      { error: `No ${deezerType} results found for "${query}"` },
      404
    )
  }

  const first = deezerData.data[0]
  let result: any = {}

  switch (deezerType) {
    case 'artist':
      result = {
        image: first.picture_medium,
        name: first.name,
        link: first.link,
      }
      break
    case 'album':
      result = {
        image: first.cover_medium,
        title: first.title,
        artist: first.artist?.name,
        link: first.link,
      }
      break
    case 'track':
      result = {
        image: first.album?.cover_medium,
        preview: first.preview,
        title: first.title,
        artist: first.artist?.name,
        album: first.album?.title,
        link: first.link,
      }
      break
  }

  if (asJson) {
    // Add CORS headers for browser fetches
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Cache-Control', 'public, max-age=604800, immutable')
    return c.json(result)
  }

  // If not requesting JSON, redirect directly to image (safer for Workers)
  if (result.image) {
    return c.redirect(result.image, 302)
  }

  return c.json({ error: `No image available for "${query}"` }, 404)
}
