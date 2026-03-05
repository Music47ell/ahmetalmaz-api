export async function getMastodonStatus(id: string) {
  const res = await fetch(`https://mastodon.social/api/v1/statuses/${id}`)
  if (!res.ok) throw new Error("Failed to fetch status")

  const s = await res.json()

  return {
    toot: {
      id: s.id,
      created_at: s.created_at,
      url: s.url,
      replies_count: s.replies_count,
      reblogs_count: s.reblogs_count,
      favourites_count: s.favourites_count,
      content: s.content,
      media_attachments: s.media_attachments
    }
  }
}