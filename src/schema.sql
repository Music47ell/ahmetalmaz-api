CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  visitorId TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  eventType TEXT NOT NULL,
  eventName TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  statusCode INTEGER NOT NULL DEFAULT 0,
  os TEXT NOT NULL DEFAULT 'Unknown',
  osVersion TEXT NOT NULL DEFAULT 'Unknown',
  browser TEXT NOT NULL DEFAULT 'Unknown',
  browserVersion TEXT NOT NULL DEFAULT 'Unknown',
  engine TEXT NOT NULL DEFAULT 'Unknown',
  engineVersion TEXT NOT NULL DEFAULT 'Unknown',
  deviceType TEXT NOT NULL DEFAULT 'Unknown',
  deviceVendor TEXT NOT NULL DEFAULT 'Unknown',
  deviceModel TEXT NOT NULL DEFAULT 'Unknown',
  flag TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Unknown',
  countryCode TEXT NOT NULL DEFAULT 'Unknown',
  city TEXT NOT NULL DEFAULT 'Unknown',
  latitude REAL,
  longitude REAL,
  timezone TEXT NOT NULL DEFAULT 'Unknown',
  continent TEXT NOT NULL DEFAULT 'Unknown',
  region TEXT NOT NULL DEFAULT 'Unknown',
  regionCode TEXT NOT NULL DEFAULT 'Unknown',
  language TEXT NOT NULL DEFAULT 'Unknown',
  userAgent TEXT NOT NULL DEFAULT '',
  screenResolution TEXT NOT NULL DEFAULT '',
  isBot INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);

CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  etag TEXT,
  lastmod TEXT,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

CREATE TABLE IF NOT EXISTS online_visitors (
  visitor_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL DEFAULT '/',
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_visitors_last_seen ON online_visitors(last_seen);

CREATE TABLE IF NOT EXISTS posts_cache (
  slug TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  frontmatter_json TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  reading_time INTEGER NOT NULL DEFAULT 0,
  mastodon_embed_json TEXT,
  etag TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_cache_updated_at ON posts_cache(updated_at);

CREATE TABLE IF NOT EXISTS blog_list_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  posts_index_json TEXT NOT NULL,
  list_etag TEXT NOT NULL,
  last_rebuilt_at INTEGER NOT NULL,
  dir_state_checksum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts_registry (
  slug TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  webdav_path TEXT NOT NULL,
  last_checked_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_registry_last_checked_at ON posts_registry(last_checked_at);

