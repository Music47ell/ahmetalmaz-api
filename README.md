# Personal Activity & Media API

This project exposes several **Hono-based APIs** to retrieve personal stats from multiple services:

* **CodeStats**: Coding activity
* **Trakt.tv**: Watched movies & shows
* **ListenBrainz**: Music listening history
* **Goodreads**: Books read
* **Analytics**: Site visitor analytics (backed by Turso/libSQL)
* **OG Image**: Dynamic Open Graph image generation

---

## Table of Contents

* [Setup](#setup)
* [Environment Variables](#environment-variables)
* [Running Locally](#running-locally)
* [API Endpoints](#api-endpoints)

  * [CodeStats](#codestats)
  * [ListenBrainz](#listenbrainz)
  * [Trakt.tv](#trakttv)
  * [Goodreads](#goodreads)
  * [Analytics](#analytics)
  * [Online Visitors](#online-visitors)
  * [OG Image](#og-image)
* [Project Structure](#project-structure)
* [Utilities](#utilities)

---

## Setup

1. Clone the repository:

```bash
git clone <repo-url>
cd <repo-folder>
```

2. Install dependencies:

```bash
bun install
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
USERNAME=<your codestats/listenbrainz/trakt username>
TRAKT_CLIENT_ID=<your trakt api client id>
TMDB_API_TOKEN=<your tmdb api bearer token>
GOODREADS_READ_FEED=<your goodreads read shelf rss url>
DATABASE_URL=<turso database url>
DATABASE_AUTH_TOKEN=<turso auth token>
REDIS_URL=<redis connection url>
ALLOWED_ORIGINS=<comma-separated list of allowed cors origins>
```

---

## Running Locally

Run the project locally:

```bash
bun run dev
```

* This will start a local server.
* All API routes defined in `src` will be available at `http://localhost:3000/<route>`.

---

## API Endpoints

### **CodeStats**

* **GET** `/codestats/stats` – Returns user XP totals and level.
* **GET** `/codestats/top-languages` – Returns top 10 languages by XP with level, progress percentage, and color.

**Stats example:**

```json
{
  "user": "ahmetalmaz",
  "level": 42,
  "total_xp": 1234567,
  "previous_xp": 1200000,
  "new_xp": 34567
}
```

---

### **ListenBrainz**

* **GET** `/listenbrainz/stats` – Account stats: account age, total listens, artists, albums, and tracks.
* **GET** `/listenbrainz/now-playing` – Current track being played.
* **GET** `/listenbrainz/recent-tracks` – Last 10 tracks with metadata & cover images.

**Track example:**

```json
{
  "artist": "Crown the Empire",
  "title": "The Fallout",
  "image": "https://...",
  "preview": "https://..."
}
```

---

### **Trakt.tv**

* **GET** `/trakt/stats` – Total movies, shows, episodes, people, networks.
* **GET** `/trakt/watched-movies` – Last 10 watched movies with TMDB poster.
* **GET** `/trakt/watched-shows` – Last 10 watched shows with TMDB poster.
* **GET** `/trakt/now-watching` – Currently watching show/movie.

**Movie example:**

```json
{
  "title": "Cloverfield",
  "poster": "https://image.tmdb.org/t/p/original/qIegUGJqyMMCRjkKV1s7A9MqdJ8.jpg",
  "url": "https://www.themoviedb.org/movie/7191-cloverfield"
}
```

---

### **Goodreads**

* **GET** `/goodreads/stats` – Reading stats: total books, pages, words, unique authors, and account age.
* **GET** `/goodreads/books-read` – Last 10 books read with title, link, rating, and poster.

**Stats example:**

```json
{
  "accountAgeYears": 3,
  "totalBooks": 42,
  "totalPages": 12600,
  "totalWords": 3150000,
  "totalDaysReading": 252,
  "uniqueAuthors": 30
}
```

---

### **Analytics**

* **POST** `/correct-horse-battery-staple` – Record a page view or event (used by the frontend).
* **GET** `/insight` – Returns monthly analytics aggregates (page views, visits, visitors, bounce rate, top countries, cities, referrers, pages, browsers, OS, devices, languages).
* **GET** `/insight/:slug` – Returns the total view count for a specific blog post slug.

---

### **Online Visitors**

* **POST** `/heartbeat` – Register a visitor as online (requires `visitorId` in request body; optional `slug`).
* **GET** `/online` – Returns the total number of online visitors and a breakdown by page.

---

### **OG Image**

* **GET** `/og?title=...&description=...&pubdate=...` – Generates and returns a PNG Open Graph image for the given parameters.

---

## Project Structure

```
src/
├─ codestats/
│  ├─ stats.ts
│  └─ topLanguages.ts
├─ curl-card/
│  └─ index.ts
├─ goodreads/
│  ├─ readBooks.ts
│  └─ stats.ts
├─ insignt/
│  └─ correct-horse-battery-staple.ts
├─ listenbrainz/
│  ├─ nowPlaying.ts
│  ├─ recentTracks.ts
│  └─ stats.ts
├─ ogGenerator/
│  └─ index.ts
├─ tmdb/
│  └─ index.ts
│  └─ index.ts
├─ trakt/
│  ├─ nowWatching.ts
│  ├─ stats.ts
│  ├─ watchedMovies.ts
│  └─ watchedShows.ts
├─ turso/
│  └─ index.ts
├─ utils/
│  ├─ helpers.ts
│  └─ redisClient.ts
├─ index.ts
└─ types.ts
```

---

## Utilities

* **helpers.ts** – Shared helpers: `normalize`, `get_level`, `get_level_progress`, `getFlagEmoji`, `decodeCfHeader`, `getCountryName`.
* **redisClient.ts** – Redis client (via `ioredis`) used for online-visitor tracking.
* **tmdb/** – Fetches movie/show data from TMDB for Trakt enrichment.
* **turso/** – Drizzle ORM client for the Turso/libSQL analytics database.

---

## Notes

* All endpoints are **async** and return JSON (except `/og` which returns `image/png`).
* Can be extended with additional endpoints easily by adding new Hono routes.
