import { getWebDAVFile } from '../utils/webdav.js'

interface Lyric {
	song: string
	band: string
	lyric: string
	date: string
}

export const getRandomLyric = async (): Promise<Lyric> => {
	const content = await getWebDAVFile('/lyrics/index.json')
	if (!content) throw new Error('Failed to fetch lyrics')
	const lyrics: Lyric[] = JSON.parse(content)
	return lyrics[Math.floor(Math.random() * lyrics.length)]
}
