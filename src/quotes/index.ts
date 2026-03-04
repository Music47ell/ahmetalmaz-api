import { getWebDAVFile } from '../utils/webdav.js'

interface Quote {
	quote: string
	source: string
	link: string
	date: string
}

export const getRandomQuote = async (): Promise<Quote> => {
	const content = await getWebDAVFile('/quotes/index.json')
	if (!content) throw new Error('Failed to fetch quotes')
	const quotes: Quote[] = JSON.parse(content)
	return quotes[Math.floor(Math.random() * quotes.length)]
}
