import matter from 'gray-matter'
import { logError } from '../utils/helpers.js'
import {
  fileExists,
  getWebDAVFile,
  getWebDAVFileBuffer,
  listWebDAVDirectory,
  type WebDAVFile,
} from '../utils/webdav.js'
import { processMarkdown } from './processor.js'
import { getMastodonStatus } from '../utils/mastodon.js'
import { CacheSystem } from '../utils/cache.js'
import { setCacheHeaders, checkNotModified } from '../utils/http-cache.js'
import type { Context } from 'hono'

const WEBDAV_URL = process.env.WEBDAV_URL
const CONTENT_PATH = 'content'
const WORDS_PER_MINUTE = 200

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
}

if (!WEBDAV_URL) throw new Error('WEBDAV_URL environment variable is required')

function getReadingStats(content: string) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
  return { wordCount, readingTime }
}

async function findIndexFile(slugDir: string): Promise<string | null> {
  for (const ext of ['md', 'mdx']) {
    const filePath = `${slugDir}/index.${ext}`
    if (await fileExists(WEBDAV_URL, filePath)) return filePath
  }
  return null
}

export interface PostMeta {
  slug: string
  frontmatter: Record<string, unknown>
  published: string
  updated: string
  wordCount: number
  readingTime: number
  content_hash: string
  etag: string
  lastmod: null  // Always null - ETag is primary
}

export interface Post extends PostMeta {
  content: string
  toot: unknown | null
}

// ──────────────────────────────────────────────────────────────
// BLOG LIST WITH INCREMENTAL REBUILD + HTTP CACHING
// ──────────────────────────────────────────────────────────────
// utils/blog.ts - Debug version
export async function getBlogList(c?: Context): Promise<PostMeta[]> {
  const startTime = Date.now()

  // 1. Check cache
  const cachedList = await CacheSystem.getBlogListCache()

  // 2. Get directory listing
  const dirEntries = await listWebDAVDirectory(WEBDAV_URL, CONTENT_PATH)

  const postDirs = dirEntries.filter(e => e.isDirectory)

  // 3. Compute checksum
  const dirStateChecksum = CacheSystem.computeContentHash(
    postDirs.map(e => e.filename).sort().join('|')
  )

  // 4. Cache hit?
  if (cachedList?.dir_state_checksum === dirStateChecksum) {
    const posts = JSON.parse(cachedList.posts_index_json) as PostMeta[]
    return posts
  }

  // 5. Cache miss - rebuild
  const posts = await rebuildBlogList()

  // 6. Save cache
  const listEtag = CacheSystem.computeListEtag(posts)
  await CacheSystem.upsertBlogListCache({
    posts_index_json: JSON.stringify(posts),
    list_etag: listEtag,
    last_rebuilt_at: Math.floor(Date.now() / 1000),
    dir_state_checksum: dirStateChecksum,
  })

  if (c) {
    setCacheHeaders(c, listEtag, null, {
      maxAge: 0, sMaxAge: 3600, staleWhileRevalidate: 604800,
    })
  }

  return posts
}

// ──────────────────────────────────────────────────────────────
// REBUILD BLOG LIST - PARALLEL + CACHE REUSE
// ──────────────────────────────────────────────────────────────
async function rebuildBlogList(): Promise<PostMeta[]> {
  const startTime = Date.now()

  try {
    const entries = await listWebDAVDirectory(WEBDAV_URL, CONTENT_PATH)
    const slugs = entries.filter(e => e.isDirectory).map(e => e.filename)

    // ⚡ PARALLEL: Process all posts concurrently
    const posts = await Promise.all(
      slugs.map(async (slug) => {
        const slugStart = Date.now()
        const slugPath = `${CONTENT_PATH}/${slug}`
        const filePath = await findIndexFile(slugPath)
        if (!filePath) return null

        try {
          const raw = await getWebDAVFile(WEBDAV_URL, filePath)
          if (!raw) return null

          const { data: frontmatter, content } = matter(raw)
          if (frontmatter.draft !== false) return null

          const contentHash = CacheSystem.computeContentHash(raw)
          const { wordCount, readingTime } = getReadingStats(content)
          const published = frontmatter.published as string ?? new Date().toISOString()
          const updated = frontmatter.updated as string ?? published

          // ⚡ CHECK POST CACHE: Reuse rendered HTML if unchanged
          const cachedPost = await CacheSystem.getCachedPost(slug)
          let renderedHtml: string
          let mastodonEmbed: string | null = null

          if (cachedPost && cachedPost.content_hash === contentHash) {
            renderedHtml = cachedPost.rendered_html
            mastodonEmbed = cachedPost.mastodon_embed_json
          } else {
            renderedHtml = await processMarkdown(content)

            if (frontmatter.toot) {
              try {
                const res = await getMastodonStatus(frontmatter.toot as string)
                mastodonEmbed = JSON.stringify(res.toot)
              } catch (err) {
                // logError(`Mastodon fetch failed for ${slug}`, err)
                mastodonEmbed = cachedPost?.mastodon_embed_json ?? null
              }
            }

            // ⚡ Update post cache
            const etag = CacheSystem.computePostEtag(contentHash)
            await CacheSystem.upsertCachedPost({
              slug,
              content_hash: contentHash,
              rendered_html: renderedHtml,
              frontmatter_json: JSON.stringify(frontmatter),
              word_count: wordCount,
              reading_time: readingTime,
              mastodon_embed_json: mastodonEmbed,
              etag,
              created_at: cachedPost?.created_at ?? Math.floor(Date.now() / 1000),
              updated_at: Math.floor(Date.now() / 1000),
            })
          }

          // ⚡ Update registry
          await CacheSystem.upsertRegistryEntry({
            slug,
            content_hash: contentHash,
            webdav_path: filePath,
            last_checked_at: Math.floor(Date.now() / 1000),
          })

          return {
            slug,
            frontmatter,
            published,
            updated,
            wordCount,
            readingTime,
            content_hash: contentHash,
            etag: CacheSystem.computePostEtag(contentHash),
            lastmod: null,
          }
        } catch (err) {
          logError(`Failed to process slug "${slug}"`, err)
          return null
        }
      })
    )

    const validPosts = posts.filter((p): p is PostMeta => p !== null)

    // 3. Cleanup deleted posts
    const registry = await CacheSystem.getAllRegistryEntries()
    await Promise.all(
      registry
        .filter(entry => !slugs.includes(entry.slug))
        .map(entry => CacheSystem.deleteCachedPost(entry.slug))
    )

    // 4. Sort by published date
    const sorted = validPosts.sort((a, b) =>
      new Date(b.published).getTime() - new Date(a.published).getTime()
    )

    return sorted
  } catch (err) {
    logError('Failed to rebuild blog list', err)
    return []
  }
}

// ──────────────────────────────────────────────────────────────
// SINGLE POST WITH CONTENT-HASH VALIDATION + 304 SUPPORT
// ──────────────────────────────────────────────────────────────
export async function getBlogPost(slug: string, c?: Context): Promise<Post | null> {
  if (!slug || /[\/\\..]/.test(slug)) return null
  const slugDir = `${CONTENT_PATH}/${slug}`

  const filePath = await findIndexFile(slugDir)
  if (!filePath) {
    await CacheSystem.deleteCachedPost(slug)
    return null
  }

  try {
    const raw = await getWebDAVFile(WEBDAV_URL, filePath)
    if (!raw) {
      await CacheSystem.deleteCachedPost(slug)
      return null
    }

    const { data: frontmatter, content } = matter(raw)
    if (frontmatter.draft !== false) {
      await CacheSystem.deleteCachedPost(slug)
      return null
    }

    const contentHash = CacheSystem.computeContentHash(raw)
    const cached = await CacheSystem.getCachedPost(slug)

    // ✅ Cache hit - no rendering needed
    if (cached && cached.content_hash === contentHash) {
      const etag = cached.etag
      if (c && checkNotModified(c, etag)) {
        throw new Error('NOT_MODIFIED')
      }
      if (c) {
        setCacheHeaders(c, etag, null, {
          maxAge: 0,
          sMaxAge: 3600,
          staleWhileRevalidate: 604800,
        })
      }
      return {
        slug: cached.slug,
        frontmatter: JSON.parse(cached.frontmatter_json),
        published: (frontmatter.published as string) ?? '',
        updated: (frontmatter.updated as string) ?? '',
        wordCount: cached.word_count,
        readingTime: cached.reading_time,
        content_hash: cached.content_hash,
        etag: cached.etag,
        lastmod: null,
        content: cached.rendered_html,
        toot: cached.mastodon_embed_json ? JSON.parse(cached.mastodon_embed_json) : null,
      }
    }

    // ❌ Cache miss - render markdown
    const html = await processMarkdown(content)
    const { wordCount, readingTime } = getReadingStats(content)

    let toot = null
    let tootJson: string | null = null
    if (frontmatter.toot) {
      try {
        const res = await getMastodonStatus(frontmatter.toot as string)
        toot = res.toot
        tootJson = JSON.stringify(toot)
      } catch (err) {
        logError(`Failed to fetch Mastodon status for post "${slug}"`, err)
        if (cached?.mastodon_embed_json) {
          tootJson = cached.mastodon_embed_json
          toot = JSON.parse(tootJson)
        }
      }
    }

    const published = frontmatter.published as string ?? new Date().toISOString()
    const updated = frontmatter.updated as string ?? published
    const etag = CacheSystem.computePostEtag(contentHash)

    if (c && checkNotModified(c, etag)) {
      await CacheSystem.upsertCachedPost({
        slug, content_hash: contentHash,
        rendered_html: html, frontmatter_json: JSON.stringify(frontmatter),
        word_count: wordCount, reading_time: readingTime,
        mastodon_embed_json: tootJson, etag,
        created_at: cached?.created_at ?? Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      })
      await CacheSystem.upsertRegistryEntry({
        slug, content_hash: contentHash, webdav_path: filePath,
        last_checked_at: Math.floor(Date.now() / 1000),
      })
      throw new Error('NOT_MODIFIED')
    }

    // 💾 Cache the newly rendered post
    await CacheSystem.upsertCachedPost({
      slug, content_hash: contentHash,
      rendered_html: html, frontmatter_json: JSON.stringify(frontmatter),
      word_count: wordCount, reading_time: readingTime,
      mastodon_embed_json: tootJson, etag,
      created_at: cached?.created_at ?? Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    })

    await CacheSystem.upsertRegistryEntry({
      slug, content_hash: contentHash, webdav_path: filePath,
      last_checked_at: Math.floor(Date.now() / 1000),
    })

    if (c) {
      setCacheHeaders(c, etag, null, {
        maxAge: 0,
        sMaxAge: 3600,
        staleWhileRevalidate: 604800,
      })
    }

    return {
      slug, frontmatter, published, updated, wordCount, readingTime,
      content_hash: contentHash, etag, lastmod: null,
      content: html, toot,
    }
  } catch (err) {
    if ((err as Error).message === 'NOT_MODIFIED') throw err
    logError(`Failed to read post "${slug}"`, err)
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// ASSETS (unchanged)
// ──────────────────────────────────────────────────────────────
export async function getBlogAsset(
  slug: string,
  filename: string,
): Promise<{ buffer: Uint8Array; contentType: string } | null> {
  const fullPath = `${CONTENT_PATH}/${slug}/assets/${filename}`
  if (fullPath.includes('..') || fullPath.includes('\\') || !fullPath.startsWith(CONTENT_PATH)) {
    return null
  }
  try {
    const raw = await getWebDAVFileBuffer(WEBDAV_URL, fullPath)
    if (!raw) return null
    const buffer = typeof Buffer !== 'undefined'
      ? new Uint8Array(Buffer.from(raw))
      : new Uint8Array(raw)
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
    return { buffer, contentType }
  } catch {
    return null
  }
}