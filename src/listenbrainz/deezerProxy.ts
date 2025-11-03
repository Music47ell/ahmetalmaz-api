import { Hono } from "hono";

export function createDeezerProxyRoute() {
  const app = new Hono();

  app.get("/", async (c) => {
  const deezerType = c.req.query("type") || "album";
  const query = c.req.query("q");
  const asJson = c.req.query("format") === "json";

  if (!query) {
    return c.json({ error: "Missing required query parameter: q" }, 400);
  }

  const deezerUrl = `https://api.deezer.com/search/${deezerType}?q=${encodeURIComponent(query)}&limit=5`;

  try {
    const deezerRes = await fetch(deezerUrl);

    if (!deezerRes.ok) {
      // log full info for production
      console.error(`[Deezer Proxy] Fetch failed for "${query}" - Status: ${deezerRes.status} ${deezerRes.statusText}`);
      const text = await deezerRes.text();
      console.error(`[Deezer Proxy] Response body:`, text);
      return c.json({ error: "Deezer fetch failed" }, 502);
    }

    const deezerData = await deezerRes.json();

    if (!deezerData?.data?.length) {
      return c.json(
        { error: `No ${deezerType} results found for "${query}"` },
        404,
      );
    }

    const first = deezerData.data[0];
    let result: any = {};
    switch (deezerType) {
      case "artist":
        result = { image: first.picture_medium, name: first.name, link: first.link };
        break;
      case "album":
        result = { image: first.cover_medium, title: first.title, artist: first.artist?.name, link: first.link };
        break;
      case "track":
        result = {
          image: first.album?.cover_medium,
          preview: first.preview,
          title: first.title,
          artist: first.artist?.name,
          album: first.album?.title,
          link: first.link,
        };
        break;
    }

    if (asJson) {
      return c.json(result);
    }

    const imgRes = await fetch(result.image);
    if (!imgRes.ok) {
      console.error(`[Deezer Proxy] Image fetch failed for "${query}" - Status: ${imgRes.status} ${imgRes.statusText}`);
      return c.json({ error: `Failed to fetch image from Deezer for "${query}"` }, 502);
    }

    c.header("Cache-Control", "public, max-age=604800, immutable");
    c.header("Content-Type", imgRes.headers.get("Content-Type") || "image/jpeg");
    return new Response(imgRes.body, { status: 200, headers: c.res.headers });

  } catch (err) {
    console.error(`[Deezer Proxy] Exception for "${query}":`, err);
    return c.json({ error: "Deezer fetch failed" }, 500);
  }
});


  return app;
}
