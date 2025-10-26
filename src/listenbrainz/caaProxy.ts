import { Hono } from 'hono'

export function createCaaProxyRoute() {
  const app = new Hono()

  app.get('/:releaseId', async (c) => {
    const { releaseId } = c.req.param()
    const size = c.req.query('size') || '500'
    const coverUrl = `https://coverartarchive.org/release/${releaseId}/front-${size}`

    try {
      const res = await fetch(coverUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'YourApp/1.0 (Hono Proxy)' },
      })

      if (!res.ok) {
        console.warn(`CAA returned ${res.status} for ${releaseId}`)
        return c.json({ error: `No cover found for ${releaseId}` }, 404)
      }

      // cache for one week
      c.header('Cache-Control', 'public, max-age=604800, immutable')
      c.header('Content-Type', res.headers.get('Content-Type') || 'image/jpeg')

      return new Response(res.body, {
        status: 200,
        headers: c.res.headers,
      })
    } catch (err) {
      console.error(`CAA proxy error for ${releaseId}:`, err)
      return c.json({ error: 'CAA fetch failed' }, 500)
    }
  })

  return app
}
