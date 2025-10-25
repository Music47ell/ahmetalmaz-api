# Personal Activity & Media API

This project exposes several **Hono-based APIs** to retrieve personal stats from multiple services:

* **CodeStats**: Coding activity
* **Trakt.tv**: Watched movies & shows
* **ListenBrainz**: Music listening history

The APIs are modular and optimized for **edge runtimes** like Cloudflare Workers.

---

## Table of Contents

* [Setup](#setup)
* [Environment Variables](#environment-variables)
* [Running Locally](#running-locally)
* [API Endpoints](#api-endpoints)

  * [CodeStats](#codestats)
  * [ListenBrainz](#listenbrainz)
  * [Trakt.tv](#trakttv)
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
npm install
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
USERNAME=<your username>
TRAKT_CLIENT_ID=<your trakt api client id>
WRANGLER_SEND_METRICS=false
```

---

## Running Locally

Run the project locally:

```bash
npm run dev
```

* This will start a local server.
* All API routes defined in `src` will be available at `http://localhost:8787/<route>`.

---

## API Endpoints

### **CodeStats**

**GET** `/codestats/stats`

Returns your total coding time and top languages:

```json
{
  "human_readable_total": "42 hrs 17 mins",
  "languages": [
    { "text": "42 hrs 17 mins", "name": "TypeScript", "percent": 60.5 },
    { "text": "12 hrs 10 mins", "name": "Bash", "percent": 17.3 }
  ]
}
```

---

### **ListenBrainz**

**Endpoints:**

* `/listenbrainz/stats` – Account stats: listens, artists, albums, tracks.
* `/listenbrainz/now-playing` – Current track being played.
* `/listenbrainz/recent-tracks` – Last 10 tracks with metadata & cover images.
* `/listenbrainz/top-albums` – Top albums of the month.
* `/listenbrainz/top-artists` – Top artists of the month.

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

**Endpoints:**

* `/trakt/stats` – Total movies, shows, episodes, people, networks.
* `/trakt/watched-movies` – Last 10 watched movies with TMDB poster.
* `/trakt/watched-shows` – Last 10 watched shows with TMDB poster.
* `/trakt/now-watching` – Currently watching show/movie.

**Movie example:**

```json
{
  "title": "Cloverfield",
  "poster": "https://image.tmdb.org/t/p/original/qIegUGJqyMMCRjkKV1s7A9MqdJ8.jpg",
  "url": "https://www.themoviedb.org/movie/7191-cloverfield"
}
```

---

## Project Structure

```
src/
├─ codestats/
│  └─ stats.ts
├─ listenbrainz/
│  └─ api.ts
├─ trakt/
│  └─ api.ts
├─ tmdb/
│  └─ tmdb.ts
└─ utils/
   └─ helpers.ts
```

**Hono server entrypoints**:

```
/codestats/stats
/listenbrainz/stats
/listenbrainz/recent-tracks
/listenbrainz/top-albums
/listenbrainz/top-artists
/trakt/stats
/trakt/watched-movies
/trakt/watched-shows
/trakt/now-watching
```

---

## Utilities

* **helpers.ts** – Access environment variables: `USERNAME`, `TRAKT_CLIENT_ID`, etc.
* **tmdb.ts** – Fetches movie/show data from TMDB for Trakt enrichment.
* **normalize** – String normalization helper for matching artists/tracks.

---

## Notes

* All endpoints are **async** and return JSON.
* Optimized for **edge runtimes** (Cloudflare Workers).
* Can be extended with additional endpoints easily by adding new Hono routes.
