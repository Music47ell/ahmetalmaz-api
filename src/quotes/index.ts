import { getWebDAVFile } from '../utils/webdav.js'

interface Quote {
	quote: string
	source: string
	link: string
	date: string
}

const WEBDAV_URL = process.env.WEBDAV_URL

export const getRandomQuote = async (): Promise<Quote> => {
	if (!WEBDAV_URL) throw new Error('WEBDAV_URL not configured')
	const content = await getWebDAVFile(WEBDAV_URL, '/quotes/index.json')
	if (!content) throw new Error('Failed to fetch quotes')
	const quotes: Quote[] = JSON.parse(content)
	return quotes[Math.floor(Math.random() * quotes.length)]
}
