import { getWebDAVFile } from '../utils/webdav.js'

interface Lyric {
	song: string
	band: string
	lyric: string
	date: string
}

const WEBDAV_URL = process.env.WEBDAV_URL

export const getRandomLyric = async (): Promise<Lyric> => {
	if (!WEBDAV_URL) throw new Error('WEBDAV_URL not configured')
	const content = await getWebDAVFile(WEBDAV_URL, '/lyrics/index.json')
	if (!content) throw new Error('Failed to fetch lyrics')
	const lyrics: Lyric[] = JSON.parse(content)
	return lyrics[Math.floor(Math.random() * lyrics.length)]
}
