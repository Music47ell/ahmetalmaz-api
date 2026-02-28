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
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

CREATE TABLE IF NOT EXISTS online_visitors (
  visitor_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL DEFAULT '/',
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_visitors_last_seen ON online_visitors(last_seen);

