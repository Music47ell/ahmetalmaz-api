import { Hono } from 'hono'

// Normalization helper (simple example, mimic your `normalize` util)
function normalizeName(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function createCaaProxyRoute() {
  const app = new Hono()

  app.get('/:releaseId', async (c) => {
    const { releaseId } = c.req.param()
    const size = c.req.query('size') || '500'
    const deezerType = c.req.query('deezerType') // 'album' | 'artist' | 'track'
    const query = c.req.query('q') // artist/album/track name
    const coverUrl = `https://coverartarchive.org/release/${releaseId}/front-${size}`

    // --- Try CAA first ---
    if (releaseId !== 'none') {
      try {
        const res = await fetch(coverUrl, {
          redirect: 'follow',
          headers: { 'User-Agent': 'YourApp/1.0 (Hono Proxy)' },
        })

        if (res.ok) {
          c.header('Cache-Control', 'public, max-age=604800, immutable')
          c.header('Content-Type', res.headers.get('Content-Type') || 'image/jpeg')
          return new Response(res.body, { status: 200, headers: c.res.headers })
        }

        console.warn(`CAA returned ${res.status} for ${releaseId}`)
      } catch (err) {
        console.error(`CAA proxy error for ${releaseId}:`, err)
      }
    }

    // --- Deezer fallback ---
    if (!deezerType || !query) {
      return c.json({ error: 'No Deezer type or query provided' }, 400)
    }

    try {
      const deezerUrl = `https://api.deezer.com/search/${deezerType}?q=${encodeURIComponent(query)}&limit=5`
      const res = await fetch(deezerUrl)
      if (!res.ok) {
        console.warn(`Deezer returned ${res.status} for ${deezerType}:${query}`)
        return c.json({ error: `No Deezer result for ${deezerType}:${query}` }, 404)
      }

      const data = await res.json()
      const results = data?.data || []
      if (results.length === 0) {
        return c.json({ error: 'No Deezer results found' }, 404)
      }

      // Normalize and match artist names (like your app does)
      const normalizedQuery = normalizeName(query)
      let match = results.find((d: any) => {
        if (deezerType === 'artist') return normalizeName(d.name) === normalizedQuery
        if (deezerType === 'album') return normalizeName(d.artist?.name) === normalizedQuery
        if (deezerType === 'track') return normalizeName(d.artist?.name) === normalizedQuery
        return false
      }) || results[0]

      let imageUrl: string | null = null
      if (deezerType === 'artist') imageUrl = match.picture_medium
      if (deezerType === 'album') imageUrl = match.cover_medium
      if (deezerType === 'track') imageUrl = match.album?.cover_medium

      if (!imageUrl) {
        console.warn(`No image found for ${deezerType}:${query}`)
        return c.json({ image: 'https://cdn-images.dzcdn.net/images/artist//250x250-000000-80-0-0.jpg' })
      }

      // If used as image proxy: stream the image
      if (c.req.header('Accept')?.includes('image')) {
        const imgRes = await fetch(imageUrl)
        c.header('Cache-Control', 'public, max-age=604800, immutable')
        c.header('Content-Type', imgRes.headers.get('Content-Type') || 'image/jpeg')
        return new Response(imgRes.body, { status: 200, headers: c.res.headers })
      }

      // Otherwise, return JSON data (for getTopArtists)
      return c.json({ image: imageUrl })
    } catch (err) {
      console.error(`Deezer fetch failed:`, err)
      return c.json({ error: 'Deezer fetch failed' }, 500)
    }
  })

  return app
}
