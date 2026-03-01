import { readFileSync } from 'node:fs'

interface Lyric {
	song: string
	band: string
	lyric: string
	date: string
}

export const getRandomLyric = (): Lyric => {
	const filePath = process.env.LYRICS_FILE_PATH
	const lyrics: Lyric[] = JSON.parse(readFileSync(filePath, 'utf-8'))
	return lyrics[Math.floor(Math.random() * lyrics.length)]
}
